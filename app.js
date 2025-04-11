// Обработчик формы
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
    return result;
}

// Форматирование результатов
function formatResults(analysis) {
    let output = "<h2>Результаты анализа:</h2>";

    // Общая информация
    output += `
        <div class="card">
            <h3>Общая информация</h3>
            <p><strong>Вендор:</strong> ${analysis.vendor}</p>
            <p><strong>Модель:</strong> ${analysis.product}</p>
            <p><strong>Объем:</strong> ${analysis.capacity}</p>
            <p><strong>Серийный номер:</strong> ${analysis.serialNumber}</p>
            <p><strong>Скорость вращения:</strong> ${analysis.rotationRate} RPM</p>
            <p><strong>Интерфейс:</strong> ${analysis.interface} (${analysis.linkRate} Gbps)</p>
        </div>
    `;

    // Здоровье диска
    output += `
        <div class="card">
            <h3>Здоровье диска</h3>
            <p><strong>Статус:</strong> ${analysis.health === "OK" 
                ? `<span class="success">Диск здоров.</span>` 
                : `<span class="error">Критическая проблема: диск не здоров (${analysis.health}).</span>`}</p>
        </div>
    `;

    // Температура
    output += `
        <div class="card">
            <h3>Температура</h3>
            <p><strong>Текущая температура:</strong> ${
                typeof analysis.temperature === "number" && analysis.temperature > 60 
                    ? `<span class="warning">Высокая температура: ${analysis.temperature}°C.</span>` 
                    : `Нормальная температура: ${analysis.temperature}°C.`}</p>
        </div>
    `;

    // График ошибок чтения/записи
    output += `
        <div class="chart-container">
            <h3>Ошибки чтения/записи</h3>
            <canvas id="errorChart" width="400" height="200"></canvas>
        </div>
    `;
    drawErrorChart(analysis);

    // Перераспределённые секторы
    output += `
        <div class="card">
            <h3>Перераспределённые секторы</h3>
            <p>${analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0 
                ? `<span class="warning">Через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.</span>` 
                : `<span class="success">Отсутствуют.</span>`}</p>
        </div>
    `;

    return output;
}

// Рисование графика ошибок
function drawErrorChart(analysis) {
    const ctx = document.getElementById("errorChart").getContext("2d");
    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["ECC Fast", "Delayed", "Rewrites"],
            datasets: [
                {
                    label: "Чтение",
                    data: [analysis.readErrors.fast, analysis.readErrors.delayed, analysis.readErrors.rewrites],
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                },
                {
                    label: "Запись",
                    data: [analysis.writeErrors.fast, analysis.writeErrors.delayed, analysis.writeErrors.rewrites],
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "top",
                },
            },
        },
    });
}

// Вспомогательные функции
function extractValue(data, regex, port = 1) {
    const matches = data.split("relative target port id = ").map(section => section.match(regex));
    return matches[port - 1]?.[1].trim() || null;
}

function convertCapacity(capacityStr) {
    if (!capacityStr) return null;
    const match = capacityStr.match(/(\d+\.\d+)\s*TB/);
    return match ? `${parseFloat(match[1]).toFixed(1)} TB` : capacityStr;
}

function countOccurrences(data, regex) {
    return (data.match(regex) || []).length;
}
