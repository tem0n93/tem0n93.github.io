document.getElementById("smartForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Предотвращаем отправку формы

    const smartData = document.getElementById("smartData").value;
    const resultsDiv = document.getElementById("results");

    try {
        const analysis = analyzeSmartData(smartData);
        resultsDiv.innerHTML = "<h2>Результаты анализа:</h2>" + formatResults(analysis);
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
    }
});

function analyzeSmartData(data) {
    const result = {};

    // Общая информация
    result.vendor = data.match(/Vendor:\s+(.+)$/m)?.[1].trim() || "Неизвестно";
    result.product = data.match(/Product:\s+(.+)$/m)?.[1].trim() || "Неизвестно";
    result.capacity = data.match(/User Capacity:\s+(.+)$/m)?.[1].trim() || "Неизвестно";
    result.serialNumber = data.match(/Serial number:\s+(.+)$/m)?.[1].trim() || "Неизвестно";

    // Здоровье диска
    result.health = data.match(/SMART Health Status:\s+(.+)$/m)?.[1].trim() || "Неизвестно";

    // Температура
    result.temperature = data.match(/Current Drive Temperature:\s+(\d+)/)?.[1] || "Неизвестно";

    // Ошибки чтения
    const readErrorsMatch = data.match(/read:\s+(\d+)\s+(\d+)\s+(\d+)/);
    result.readErrors = readErrorsMatch
        ? { fast: parseInt(readErrorsMatch[1]), delayed: parseInt(readErrorsMatch[2]), rewrites: parseInt(readErrorsMatch[3]) }
        : { fast: 0, delayed: 0, rewrites: 0 };

    // Перераспределённые секторы
    const reallocatedInplace = (data.match(/Recovered via rewrite in-place/g) || []).length;
    const reallocatedApp = (data.match(/Reassigned by app/g) || []).length;
    result.reallocatedSectors = { inplace: reallocatedInplace, app: reallocatedApp };

    return result;
}

function formatResults(analysis) {
    let output = "";

    // Общая информация
    output += `<p><strong>Вендор:</strong> ${analysis.vendor}</p>`;
    output += `<p><strong>Модель:</strong> ${analysis.product}</p>`;
    output += `<p><strong>Объем:</strong> ${analysis.capacity}</p>`;
    output += `<p><strong>Серийный номер:</strong> ${analysis.serialNumber}</p>`;

    // Здоровье диска
    if (analysis.health === "OK") {
        output += "<p><strong>Здоровье:</strong> Диск здоров.</p>";
    } else {
        output += `<p style="color: red;"><strong>Здоровье:</strong> Критическая проблема: диск не здоров (${analysis.health}).</p>`;
    }

    // Температура
    if (analysis.temperature > 60) {
        output += `<p style="color: orange;"><strong>Температура:</strong> Высокая температура: ${analysis.temperature}°C.</p>`;
    } else {
        output += `<p><strong>Температура:</strong> Нормальная температура: ${analysis.temperature}°C.</p>`;
    }

    // Ошибки чтения
    if (analysis.readErrors.delayed > 0) {
        output += `<p><strong>Ошибки чтения:</strong> Обнаружены задержанные ошибки чтения (${analysis.readErrors.delayed} раз).</p>`;
    } else {
        output += "<p><strong>Ошибки чтения:</strong> Ошибок чтения нет.</p>";
    }

    // Перераспределённые секторы
    if (analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0) {
        output += `<p><strong>Перераспределённые секторы:</strong> Через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.</p>`;
    } else {
        output += "<p><strong>Перераспределённые секторы:</strong> Отсутствуют.</p>";
    }

    return output;
}
