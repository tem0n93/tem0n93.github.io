document.getElementById('analyzeButton').addEventListener('click', function () {
    const logInput = document.getElementById('logInput').value;
    const output = document.getElementById('output');

    if (!logInput.trim()) {
        output.textContent = 'Ошибка: Введите логи для анализа.';
        return;
    }

    try {
        const results = analyzeLogs(logInput);
        output.textContent = formatResults(results);
    } catch (error) {
        output.textContent = `Ошибка анализа: ${error.message}`;
    }
});

function analyzeLogs(logs) {
    const lines = logs.split('\n');
    const results = {
        linkUpCount: 0,
        linkDownCount: 0,
        errors: [],
    };

    lines.forEach(line => {
        if (line.includes('Link Up')) {
            results.linkUpCount++;
        } else if (line.includes('Link Down')) {
            results.linkDownCount++;
        }

        const errorMatch = line.match(/Invalid DWord Count (\d+)|Running Disparity Error Count (\d+)/);
        if (errorMatch) {
            results.errors.push(line.trim());
        }
    });

    return results;
}

function formatResults(results) {
    let formatted = `Общее количество активных соединений (Link Up): ${results.linkUpCount}\n`;
    formatted += `Общее количество неактивных соединений (Link Down): ${results.linkDownCount}\n\n`;

    if (results.errors.length > 0) {
        formatted += 'Обнаруженные ошибки:\n';
        results.errors.forEach(error => {
            formatted += `- ${error}\n`;
        });
    } else {
        formatted += 'Ошибки не обнаружены.\n';
    }

    return formatted;
}
