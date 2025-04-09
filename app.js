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

    // Здоровье диска
    const healthMatch = data.match(/SMART Health Status:\s+(.+)$/m);
    result.health = healthMatch ? healthMatch[1].trim() : "Неизвестно";

    // Температура
    const tempMatch = data.match(/Current Drive Temperature:\s+(\d+)/);
    result.temperature = tempMatch ? parseInt(tempMatch[1]) : "Неизвестно";

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

    // Здоровье диска
    if (analysis.health === "OK") {
        output += "<p>Диск здоров.</p>";
    } else {
        output += `<p style="color: red;">Критическая проблема: диск не здоров (${analysis.health}).</p>`;
    }

    // Температура
    if (analysis.temperature > 60) {
        output += `<p style="color: orange;">Температура высокая: ${analysis.temperature}°C.</p>`;
    } else {
        output += `<p>Температура в норме: ${analysis.temperature}°C.</p>`;
    }

    // Ошибки чтения
    if (analysis.readErrors.delayed > 0) {
        output += `<p>Обнаружены задержанные ошибки чтения (${analysis.readErrors.delayed} раз).</p>`;
    } else {
        output += "<p>Ошибок чтения нет.</p>";
    }

    // Перераспределённые секторы
    if (analysis.reallocatedSectors.inplace > 0 || analysis.reallocatedSectors.app > 0) {
        output += `<p>Обнаружено перераспределённых секторов через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.</p>`;
    } else {
        output += "<p>Перераспределённых секторов нет.</p>";
    }

    return output;
}
