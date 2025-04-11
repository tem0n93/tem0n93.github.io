document.getElementById("smartForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Предотвращаем отправку формы

    const smartData = document.getElementById("smartData").value.trim();
    try {
        if (!smartData) throw new Error("Пожалуйста, вставьте данные SMART.");

        const analysis = analyzeSmartData(smartData);

        // Заполняем вкладки
        document.getElementById("general").innerHTML = formatGeneralInfo(analysis);
        document.getElementById("errors").innerHTML = formatErrors(analysis);
        document.getElementById("background").innerHTML = formatBackgroundScan(analysis);
        document.getElementById("sas").innerHTML = formatSasSspLog(analysis);

        // Показываем кнопку экспорта
        document.getElementById("exportButton").style.display = "inline-block";
        document.getElementById("exportButton").onclick = () => exportResults(analysis);

        // Создаем график температуры
        createTemperatureChart(analysis.temperature);

        // Проверяем проблемы
        document.getElementById("general").innerHTML += checkIssues(analysis);
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    }
});

// Функция анализа данных SMART
function analyzeSmartData(data) {
    const result = {};

    // Общая информация
    result.vendor = extractValue(data, /Vendor:\s+(.+)$/m) || "Неизвестно";
    result.product = extractValue(data, /Product:\s+(.+)$/m) || "Неизвестно";
    result.capacity = convertCapacity(extractValue(data, /User Capacity:\s+(.+)$/m)) || "Неизвестно";
    result.serialNumber = extractValue(data, /Serial number:\s+(.+)$/m) || "Неизвестно";
    result.health = extractValue(data, /SMART Health Status:\s+(.+)$/m) || "Неизвестно";
    result.temperature = parseInt(extractValue(data, /Current Drive Temperature:\s+(\d+)/)) || "Неизвестно";

    // Ошибки чтения/записи
    const readErrorsMatch = data.match(/read:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([\d.]+)/);
    result.readErrors = readErrorsMatch
        ? {
            fast: parseInt(readErrorsMatch[1]),
            delayed: parseInt(readErrorsMatch[2]),
            rewrites: parseInt(readErrorsMatch[3]),
            gigabytesProcessed: parseFloat(readErrorsMatch[4]),
            uncorrectedErrors: extractValue(data, /read:.+?\s+(\d+)$/m)
        }
        : { fast: 0, delayed: 0, rewrites: 0, gigabytesProcessed: 0, uncorrectedErrors: 0 };

    const writeErrorsMatch = data.match(/write:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([\d.]+)/);
    result.writeErrors = writeErrorsMatch
        ? {
            fast: parseInt(writeErrorsMatch[1]),
            delayed: parseInt(writeErrorsMatch[2]),
            rewrites: parseInt(writeErrorsMatch[3]),
            gigabytesProcessed: parseFloat(writeErrorsMatch[4]),
            uncorrectedErrors: extractValue(data, /write:.+?\s+(\d+)$/m)
        }
        : { fast: 0, delayed: 0, rewrites: 0, gigabytesProcessed: 0, uncorrectedErrors: 0 };

    // Перераспределённые секторы
    result.reallocatedSectors = {
        inplace: countOccurrences(data, /Recovered via rewrite in-place/),
        app: countOccurrences(data, /Reassigned by app/)
    };

    // Результаты фонового сканирования
    result.backgroundScan = {
        status: extractValue(data, /Status:\s+(.+)$/m) || "Неизвестно",
        powerOnTime: extractValue(data, /Accumulated power on time,\s+hours:minutes\s+(\d+):(\d+)/) || "Неизвестно",
        scansPerformed: extractValue(data, /Number of background scans performed:\s+(\d+)/) || "Неизвестно",
        mediumScansPerformed: extractValue(data, /Number of background medium scans performed:\s+(\d+)/) || "Неизвестно",
        scanProgress: extractValue(data, /scan progress:\s+(\d+.\d+)%/) || "Неизвестно"
    };

    // Журнал протокола SAS SSP
    result.sasSspLog = {
        port1: {
            invalidDwordCount: extractValue(data, /relative target port id = 1.*?Invalid DWORD count = (\d+)/ms) || 0,
            disparityErrorCount: extractValue(data, /relative target port id = 1.*?Running disparity error count = (\d+)/ms) || 0,
            lossSyncCount: extractValue(data, /relative target port id = 1.*?Loss of DWORD synchronization = (\d+)/ms) || 0,
            phyResetProblemCount: extractValue(data, /relative target port id = 1.*?Phy reset problem = (\d+)/ms) || 0
        },
        port2: {
            invalidDwordCount: extractValue(data, /relative target port id = 2.*?Invalid DWORD count = (\d+)/ms) || 0,
            disparityErrorCount: extractValue(data, /relative target port id = 2.*?Running disparity error count = (\d+)/ms) || 0,
            lossSyncCount: extractValue(data, /relative target port id = 2.*?Loss of DWORD synchronization = (\d+)/ms) || 0,
            phyResetProblemCount: extractValue(data, /relative target port id = 2.*?Phy reset problem = (\d+)/ms) || 0
        }
    };

    return result;
}

// Форматирование общей информации
function formatGeneralInfo(analysis) {
    let output = `<table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Вендор</td><td>${analysis.vendor}</td></tr>
        <tr><td>Модель</td><td>${analysis.product}</td></tr>
        <tr><td>Объем</td><td>${analysis.capacity}</td></tr>
        <tr><td>Серийный номер</td><td>${analysis.serialNumber}</td></tr>
        <tr><td>Здоровье диска</td><td>${analysis.health === "OK" ? "Диск здоров." : `<span class="error">Критическая проблема: диск не здоров (${analysis.health}).</span>`}</td></tr>
    </table>`;
    return output;
}

// Форматирование ошибок чтения/записи
function formatErrors(analysis) {
    return `<table>
        <tr>
            <th>Операция</th>
            <th>ECC Fast</th>
            <th>Delayed</th>
            <th>Rewrites</th>
            <th>Гигабайты обработано</th>
            <th>Некорректируемые ошибки</th>
        </tr>
        <tr>
            <td>Чтение</td>
            <td>${analysis.readErrors.fast}</td>
            <td>${analysis.readErrors.delayed}</td>
            <td>${analysis.readErrors.rewrites}</td>
            <td>${parseFloat(analysis.readErrors.gigabytesProcessed).toFixed(3)} GB</td>
            <td>${analysis.readErrors.uncorrectedErrors}</td>
        </tr>
        <tr>
            <td>Запись</td>
            <td>${analysis.writeErrors.fast}</td>
            <td>${analysis.writeErrors.delayed}</td>
            <td>${analysis.writeErrors.rewrites}</td>
            <td>${parseFloat(analysis.writeErrors.gigabytesProcessed).toFixed(3)} GB</td>
            <td>${analysis.writeErrors.uncorrectedErrors}</td>
        </tr>
    </table>`;
}

// Форматирование фонового сканирования
function formatBackgroundScan(analysis) {
    return `<table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Статус</td><td>${analysis.backgroundScan.status}</td></tr>
        <tr><td>Накопленное время работы</td><td>${analysis.backgroundScan.powerOnTime} часов</td></tr>
        <tr><td>Количество выполненных сканирований</td><td>${analysis.backgroundScan.scansPerformed}</td></tr>
        <tr><td>Прогресс последнего сканирования</td><td>${analysis.backgroundScan.scanProgress}%</td></tr>
    </table>`;
}

// Форматирование журнала SAS SSP
function formatSasSspLog(analysis) {
    return `<table>
        <tr><th>Параметр</th><th>Значение (Port 1)</th><th>Значение (Port 2)</th></tr>
        <tr><td>Invalid DWORD Count</td><td>${analysis.sasSspLog.port1.invalidDwordCount}</td><td>${analysis.sasSspLog.port2.invalidDwordCount}</td></tr>
        <tr><td>Disparity Error Count</td><td>${analysis.sasSspLog.port1.disparityErrorCount}</td><td>${analysis.sasSspLog.port2.disparityErrorCount}</td></tr>
        <tr><td>Loss of Sync Count</td><td>${analysis.sasSspLog.port1.lossSyncCount}</td><td>${analysis.sasSspLog.port2.lossSyncCount}</td></tr>
        <tr><td>Phy Reset Problem Count</td><td>${analysis.sasSspLog.port1.phyResetProblemCount}</td><td>${analysis.sasSspLog.port2.phyResetProblemCount}</td></tr>
    </table>`;
}

// Экспорт результатов в JSON
function exportResults(analysis) {
    const jsonString = JSON.stringify(analysis, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smart_analysis.json";
    a.click();
    URL.revokeObjectURL(url);
}

// График температуры
function createTemperatureChart(temperature) {
    const ctx = document.getElementById("temperatureChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Текущая температура"],
            datasets: [{
                label: "Температура (°C)",
                data: [temperature],
                backgroundColor: temperature > 60 ? "orange" : "green",
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Проверка проблем
function checkIssues(analysis) {
    let issues = [];

    if (analysis.temperature > 60) {
        issues.push("Высокая температура диска.");
    }

    if (analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0) {
        issues.push("Обнаружены перераспределённые секторы.");
    }

    if (issues.length > 0) {
        return `<p class="warning">Обнаружены проблемы:<br>${issues.join("<br>")}</p>`;
    }

    return "";
}

// Вспомогательные функции
function extractValue(data, regex) {
    const match = data.match(regex);
    return match ? match[1].trim() : null;
}

function convertCapacity(capacityStr) {
    if (!capacityStr) return null;
    const match = capacityStr.match(/([\d,.]+)\s*TB/);
    return match ? `${parseFloat(match[1]).toFixed(1)} TB` : capacityStr;
}

function countOccurrences(data, regex) {
    return (data.match(new RegExp(regex, "g")) || []).length;
}
