document.getElementById("smartForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Предотвращаем отправку формы

    const smartData = document.getElementById("smartData").value.trim();
    const resultsDiv = document.getElementById("results");

    try {
        if (!smartData) throw new Error("Пустые данные!");

        const analysis = analyzeSmartData(smartData);
        resultsDiv.innerHTML = formatResults(analysis);
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Ошибка: ${error.message}</p>`;
    }
});

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

    // Ошибки чтения
    const readErrorsMatch = data.match(/read:\s+(\d+)\s+(\d+)\s+(\d+)/);
    result.readErrors = readErrorsMatch
        ? { fast: parseInt(readErrorsMatch[1]), delayed: parseInt(readErrorsMatch[2]), rewrites: parseInt(readErrorsMatch[3]) }
        : { fast: 0, delayed: 0, rewrites: 0 };

    // Перераспределённые секторы
    result.reallocatedSectors = {
        inplace: countOccurrences(data, /Recovered via rewrite in-place/),
        app: countOccurrences(data, /Reassigned by app/)
    };

    return result;
}

function formatResults(analysis) {
    let output = "<h2>Результаты анализа:</h2>";

    // Общая информация
    output += `<table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Вендор</td><td>${analysis.vendor}</td></tr>
        <tr><td>Модель</td><td>${analysis.product}</td></tr>
        <tr><td>Объем</td><td>${analysis.capacity}</td></tr>
        <tr><td>Серийный номер</td><td>${analysis.serialNumber}</td></tr>
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

    // Ошибки чтения
    if (analysis.readErrors.delayed > 0) {
        output += `<p><strong>Ошибки чтения:</strong> Обнаружены задержанные ошибки чтения (${analysis.readErrors.delayed} раз).</p>`;
    } else {
        output += `<p><strong>Ошибки чтения:</strong> Ошибок чтения нет.</p>`;
    }

    // Перераспределённые секторы
    if (analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0) {
        output += `<p><strong>Перераспределённые секторы:</strong> Через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.</p>`;
    } else {
        output += `<p><strong>Перераспределённые секторы:</strong> Отсутствуют.</p>`;
    }

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
