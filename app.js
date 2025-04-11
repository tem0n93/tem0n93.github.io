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
    result.revision = extractValue(data, /Revision:\s+(.+)$/m) || "Неизвестно"; // Версия прошивки
    result.capacity = convertCapacity(extractValue(data, /User Capacity:\s+(.+)$/m)) || "Неизвестно";
    result.serialNumber = extractValue(data, /Serial number:\s+(.+)$/m) || "Неизвестно";
    result.health = extractValue(data, /SMART Health Status:\s+(.+)$/m) || "Неизвестно";
    result.temperature = parseInt(extractValue(data, /Current Drive Temperature:\s+(\d+)/)) || "Неизвестно";
    result.driveTripTemperature = parseInt(extractValue(data, /Drive Trip Temperature:\s+(\d+)/)) || "Неизвестно";

    // Циклы включения/выключения
    result.startStopCycles = {
        specified: parseInt(extractValue(data, /Specified cycle count over device lifetime:\s+(\d+)/)) || 0,
        accumulated: parseInt(extractValue(data, /Accumulated start-stop cycles:\s+(\d+)/)) || 0,
    };

    // Циклы загрузки/выгрузки
    result.loadUnloadCycles = {
        specified: parseInt(extractValue(data, /Specified load-unload count over device lifetime:\s+(\d+)/)) || 0,
        accumulated: parseInt(extractValue(data, /Accumulated load-unload cycles:\s+(\d+)/)) || 0,
    };

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
    result.pendingSectors = parseInt(extractValue(data, /Elements in grown defect list:\s+(\d+)/)) || 0;
    result.offlineUncorrectableSectors = parseInt(extractValue(data, /Offline uncorrectable sectors:\s+(\d+)/)) || 0;

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
        <tr><td>Ревизия (прошивка)</td><td>${analysis.revision}</td></tr>
        <tr><td>Объем</td><td>${analysis.capacity}</td></tr>
        <tr><td>Серийный номер</td><td>${analysis.serialNumber}</td></tr>
        <tr><td>Текущая температура</td><td>${analysis.temperature}°C</td></tr>
        <tr><td>Пороговая температура</td><td>${analysis.driveTripTemperature}°C</td></tr>
        <tr><td>Количество циклов включения/выключения</td><td>${analysis.startStopCycles.accumulated} из ${analysis.startStopCycles.specified}</td></tr>
        <tr><td>Количество циклов загрузки/выгрузки</td><td>${analysis.loadUnloadCycles.accumulated} из ${analysis.loadUnloadCycles.specified}</td></tr>
        <tr><td>Ожидающие перераспределения сектора</td><td>${analysis.pendingSectors}</td></tr>
        <tr><td>Неисправимые сектора в автономном режиме</td><td>${analysis.offlineUncorrectableSectors}</td></tr>
        <tr><td>Здоровье диска</td><td>${analysis.health === "OK" ? "Диск здоров." : `<span class="error">Критическая проблема: диск не здоров (${analysis.health}).</span>`}</td></tr>
    </table>`;
    return output;
}

// Анализ трендов ошибок чтения/записи
function analyzeErrorTrends(analysis) {
    const totalReadErrors = analysis.readErrors.fast + analysis.readErrors.delayed;
    const totalWriteErrors = analysis.writeErrors.fast + analysis.writeErrors.delayed;

    let trendMessage = "";
    if (totalReadErrors > 100 || totalWriteErrors > 100) {
        trendMessage = "<p class='warning'>Высокий уровень ошибок чтения/записи. Возможна деградация носителя.</p>";
    } else {
        trendMessage = "<p>Уровень ошибок чтения/записи в норме.</p>";
    }

    return trendMessage;
}

// Проверка проблем
function checkIssues(analysis) {
    let issues = [];

    if (analysis.temperature > 60) {
        issues.push("Высокая температура диска.");
    }

    if (analysis.pendingSectors > 0) {
        issues.push("Обнаружены ожидающие перераспределения сектора.");
    }

    if (analysis.offlineUncorrectableSectors > 0) {
        issues.push("Обнаружены неисправимые сектора в автономном режиме.");
    }

    if (issues.length > 0) {
        return `<p class="warning">Обнаружены проблемы:<br>${issues.join("<br>")}</p>`;
    }

    return "";
}
