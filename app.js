document.getElementById("smartForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Предотвращаем отправку формы

    const smartData = document.getElementById("smartData").value.trim();
    const resultsDiv = document.getElementById("results");

    try {
        if (!smartData) throw new Error("Пожалуйста, вставьте данные SMART.");

        const analysis = analyzeSmartData(smartData);
        resultsDiv.innerHTML = formatResults(analysis);
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Ошибка: ${error.message}</p>`;
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

    // Здоровье диска
    result.health = extractValue(data, /SMART Health Status:\s+(.+)$/m) || "Неизвестно";

    // Температура
    result.temperature = parseInt(extractValue(data, /Current Drive Temperature:\s+(\d+)/)) || "Неизвестно";

    // Скорость вращения
    result.rotationRate = extractValue(data, /Rotation Rate:\s+(\d+)\s+rpm/) || "Неизвестно";

    // Интерфейс и скорость
    result.interface = extractValue(data, /Transport protocol:\s+(.+)\s+\(.*\)/) || "Неизвестно";
    result.linkRate = extractValue(data, /negotiated logical link rate: phy enabled;\s+(\d+)\s+Gbps/) || "Неизвестно";

    // Тип подключения
    result.connectionType = extractValue(data, /attached device type:\s+(.+)$/m) || "Неизвестно";

    // Циклы включения/выключения
    result.startStopCyclesSpecified = extractValue(data, /Specified cycle count over device lifetime:\s+(\d+)/) || "Неизвестно";
    result.startStopCyclesActual = extractValue(data, /Accumulated start-stop cycles:\s+(\d+)/) || "Неизвестно";

    // Циклы загрузки/разгрузки головок
    result.loadUnloadCyclesSpecified = extractValue(data, /Specified load-unload count over device lifetime:\s+(\d+)/) || "Неизвестно";
    result.loadUnloadCyclesActual = extractValue(data, /Accumulated load-unload cycles:\s+(\d+)/) || "Неизвестно";

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

// Форматирование результатов
function formatResults(analysis) {
    let output = "<h2>Результаты анализа:</h2>";

    // Общая информация
    output += `<table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Вендор</td><td>${analysis.vendor}</td></tr>
        <tr><td>Модель</td><td>${analysis.product}</td></tr>
        <tr><td>Объем</td><td>${analysis.capacity}</td></tr>
        <tr><td>Серийный номер</td><td>${analysis.serialNumber}</td></tr>
        <tr><td>Скорость вращения</td><td>${analysis.rotationRate} RPM</td></tr>
        <tr><td>Интерфейс</td><td>${analysis.interface} (${analysis.linkRate} Gbps)</td></tr>
        <tr><td>Тип подключения</td><td>${analysis.connectionType}</td></tr>
    </table>`;

    // Здоровье диска
    output += `<p><strong>Здоровье:</strong> ${analysis.health === "OK" ? "Диск здоров." : `<span class="error">Критическая проблема: диск не здоров (${analysis.health}).</span>`}</p>`;

    // Температура
    if (typeof analysis.temperature === "number") {
        if (analysis.temperature > 60) {
            output += `<p><strong>Температура:</strong> <span class="warning">Высокая температура: ${analysis.temperature}°C.</span></p>`;
        } else {
            output += `<p><strong>Температура:</strong> Нормальная температура: ${analysis.temperature}°C.</p>`;
        }
    }

    // Циклы включения/выключения
    output += `<p><strong>Циклы включения/выключения:</strong> Заданный лимит: ${analysis.startStopCyclesSpecified}, Актуальное значение: ${analysis.startStopCyclesActual}</p>`;

    // Циклы загрузки/разгрузки головок
    output += `<p><strong>Циклы загрузки/разгрузки головок:</strong> Заданный лимит: ${analysis.loadUnloadCyclesSpecified}, Актуальное значение: ${analysis.loadUnloadCyclesActual}</p>`;

    // Таблица Error counter log
    output += `<h3>Error counter log</h3>`;
    output += `<table>
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

    // Перераспределённые секторы
    if (analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0) {
        output += `<p><strong>Перераспределённые секторы:</strong> Через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.</p>`;
    } else {
        output += `<p><strong>Перераспределённые секторы:</strong> Отсутствуют.</p>`;
    }

    // Результаты фонового сканирования
    output += `<h3>Фоновое сканирование</h3>`;
    output += `<table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Статус</td><td>${analysis.backgroundScan.status}</td></tr>
        <tr><td>Накопленное время работы</td><td>${analysis.backgroundScan.powerOnTime} часов</td></tr>
        <tr><td>Количество выполненных сканирований</td><td>${analysis.backgroundScan.scansPerformed}</td></tr>
        <tr><td>Количество выполненных сканирований поверхности</td><td>${analysis.backgroundScan.mediumScansPerformed}</td></tr>
        <tr><td>Прогресс последнего сканирования</td><td>${analysis.backgroundScan.scanProgress}%</td></tr>
    </table>`;

    // Журнал протокола SAS SSP
    output += `<h3>Журнал протокола SAS SSP</h3>`;
    output += `<table>
        <tr><th>Параметр</th><th>Значение (Port 1)</th><th>Значение (Port 2)</th></tr>
        <tr><td>Invalid DWORD Count</td><td>${analysis.sasSspLog.port1.invalidDwordCount}</td><td>${analysis.sasSspLog.port2.invalidDwordCount}</td></tr>
        <tr><td>Disparity Error Count</td><td>${analysis.sasSspLog.port1.disparityErrorCount}</td><td>${analysis.sasSspLog.port2.disparityErrorCount}</td></tr>
        <tr><td>Loss of Sync Count</td><td>${analysis.sasSspLog.port1.lossSyncCount}</td><td>${analysis.sasSspLog.port2.lossSyncCount}</td></tr>
        <tr><td>Phy Reset Problem Count</td><td>${analysis.sasSspLog.port1.phyResetProblemCount}</td><td>${analysis.sasSspLog.port2.phyResetProblemCount}</td></tr>
    </table>`;

    return output;
}

// Вспомогательные функции
function extractValue(data, regex) {
    const match = data.match(regex);
    return match ? match[1].trim() : null;
}

function convertCapacity(capacityStr) {
    if (!capacityStr) return null;
    const match = capacityStr.match(/(\d+\.\d+)\s*TB/);
    return match ? `${parseFloat(match[1]).toFixed(1)} TB` : capacityStr;
}

function countOccurrences(data, regex) {
    return (data.match(regex) || []).length;
}
