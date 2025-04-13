document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("smartForm").addEventListener("submit", function (event) {
        event.preventDefault(); // Предотвращаем отправку формы
        const smartData = document.getElementById("smartData").value.trim();
        const tabsContainer = document.getElementById("tabs");
        const tabContentContainers = document.querySelectorAll(".tab-content");

        try {
            if (!smartData) throw new Error("Пожалуйста, вставьте данные SMART.");
            const analysis = analyzeSmartData(smartData);
            formatResultsWithTabs(analysis);
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        }

        function formatResultsWithTabs(analysis) {
            // Очистка содержимого вкладок
            tabsContainer.innerHTML = "";
            tabContentContainers.forEach((tab) => (tab.innerHTML = ""));

            // Создание вкладок
            const tabTitles = [
                { id: "general-info", title: "Общая информация" },
                { id: "disk-health", title: "Здоровье диска" },
                { id: "error-log", title: "Ошибки чтения/записи" },
                { id: "background-scan", title: "Фоновое сканирование" },
                { id: "sas-log", title: "Журнал SAS SSP" },
            ];

            tabTitles.forEach(({ id, title }, index) => {
                const tab = document.createElement("div");
                tab.className = "tab";
                tab.textContent = title;
                tab.dataset.tab = id; // Добавляем атрибут data-tab
                tab.onclick = () => switchTab(id); // Добавляем обработчик клика
                tabsContainer.appendChild(tab);

                if (index === 0) {
                    tab.classList.add("active");
                    document.getElementById(id).classList.add("active");
                }
            });

            // Заполнение содержимого вкладок
            document.getElementById("general-info").innerHTML = `
                <div class="card">
                    <h3>Общая информация</h3>
                    <table>
                        <tr><th>Параметр</th><th>Значение</th></tr>
                        <tr><td>Вендор</td><td>${analysis.vendor || "Недоступно"}</td></tr>
                        <tr><td>Модель</td><td>${analysis.product || "Недоступно"}</td></tr>
                        <tr><td>Объем</td><td>${analysis.capacity || "Недоступно"}</td></tr>
                        <tr><td>Серийный номер</td><td>${analysis.serialNumber || "Недоступно"}</td></tr>
                        <tr><td>Скорость вращения</td><td>${
                            analysis.rotationRate || "Недоступно"
                        } RPM</td></tr>
                        <tr><td>Интерфейс</td><td>${
                            `${analysis.interface} (${analysis.linkRate} Gbps)`
                        }</td></tr>
                        <tr><td>Тип подключения</td><td>${
                            analysis.connectionType || "Недоступно"
                        }</td></tr>
                    </table>
                </div>
            `;

            document.getElementById("disk-health").innerHTML = `
                <div class="card">
                    <h3>Здоровье диска</h3>
                    <p><strong>Статус:</strong> ${
                        analysis.health === "OK"
                            ? `<span class="success">Диск здоров.</span>`
                            : `<span class="error">Критическая проблема: диск не здоров (${analysis.health}).</span>`
                    }</p>
                    <p><strong>Текущая температура:</strong> ${
                        typeof analysis.temperature === "number"
                            ? analysis.temperature > 60
                                ? `<span class="warning">Высокая температура: ${analysis.temperature}°C.</span>`
                                : `Нормальная температура: ${analysis.temperature}°C.`
                            : "Неизвестно."
                    }</p>
                </div>
            `;

            document.getElementById("error-log").innerHTML = `
                <div class="card">
                    <h3>Ошибки чтения/записи</h3>
                    <!-- Таблица -->
                    <table>
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
                            <td>${analysis.readErrors.fast || 0}</td>
                            <td>${analysis.readErrors.delayed || 0}</td>
                            <td>${analysis.readErrors.rewrites || 0}</td>
                            <td>${
                                parseFloat(analysis.readErrors.gigabytesProcessed).toFixed(3) || 0
                            } GB</td>
                            <td>${analysis.readErrors.uncorrectedErrors || 0}</td>
                        </tr>
                        <tr>
                            <td>Запись</td>
                            <td>${analysis.writeErrors.fast || 0}</td>
                            <td>${analysis.writeErrors.delayed || 0}</td>
                            <td>${analysis.writeErrors.rewrites || 0}</td>
                            <td>${
                                parseFloat(analysis.writeErrors.gigabytesProcessed).toFixed(3) || 0
                            } GB</td>
                            <td>${analysis.writeErrors.uncorrectedErrors || 0}</td>
                        </tr>
                    </table>
                    <!-- График -->
                    <div class="chart-container">
                        <canvas id="errorChart"></canvas>
                    </div>
                </div>
            `;
            drawErrorChart(analysis);

            document.getElementById("background-scan").innerHTML = `
                <div class="card">
                    <h3>Фоновое сканирование</h3>
                    <table>
                        <tr><th>Параметр</th><th>Значение</th></tr>
                        <tr><td>Статус</td><td>${
                            analysis.backgroundScan.status || "Недоступно"
                        }</td></tr>
                        <tr><td>Накопленное время работы</td><td>${
                            analysis.backgroundScan.powerOnTime || "Недоступно"
                        } часов</td></tr>
                        <tr><td>Количество выполненных сканирований</td><td>${
                            analysis.backgroundScan.scansPerformed || "Недоступно"
                        }</td></tr>
                        <tr><td>Количество выполненных сканирований поверхности</td><td>${
                            analysis.backgroundScan.mediumScansPerformed || "Недоступно"
                        }</td></tr>
                        <tr><td>Прогресс последнего сканирования</td><td>${
                            analysis.backgroundScan.scanProgress || "Недоступно"
                        }%</td></tr>
                    </table>
                </div>
            `;

            document.getElementById("sas-log").innerHTML = `
                <div class="card">
                    <h3>Журнал протокола SAS SSP</h3>
                    <table>
                        <tr><th>Параметр</th><th>Значение (Port 1)</th><th>Значение (Port 2)</th></tr>
                        <tr><td>Invalid DWORD Count</td><td>${
                            analysis.sasSspLog.port1.invalidDwordCount || 0
                        }</td><td>${analysis.sasSspLog.port2.invalidDwordCount || 0}</td></tr>
                        <tr><td>Disparity Error Count</td><td>${
                            analysis.sasSspLog.port1.disparityErrorCount || 0
                        }</td><td>${
                            analysis.sasSspLog.port2.disparityErrorCount || 0
                        }</td></tr>
                        <tr><td>Loss of Sync Count</td><td>${
                            analysis.sasSspLog.port1.lossSyncCount || 0
                        }</td><td>${
                            analysis.sasSspLog.port2.lossSyncCount || 0
                        }</td></tr>
                        <tr><td>Phy Reset Problem Count</td><td>${
                            analysis.sasSspLog.port1.phyResetProblemCount || 0
                        }</td><td>${
                            analysis.sasSspLog.port2.phyResetProblemCount || 0
                        }</td></tr>
                    </table>
                </div>
            `;

            // Переключение вкладок
            function switchTab(tabId) {
                const tabs = document.querySelectorAll(".tab");
                const tabContents = document.querySelectorAll(".tab-content");

                tabs.forEach((tab) => tab.classList.remove("active"));
                tabContents.forEach((content) => content.classList.remove("active"));

                document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
                document.getElementById(tabId).classList.add("active");
            }
        }

        // Рисование графика ошибок
        function drawErrorChart(analysis) {
            const ctx = document.getElementById("errorChart");
            if (!ctx) return;

            const chart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: ["ECC Fast", "Delayed", "Rewrites"],
                    datasets: [
                        {
                            label: "Чтение",
                            data: [
                                analysis.readErrors.fast || 0,
                                analysis.readErrors.delayed || 0,
                                analysis.readErrors.rewrites || 0,
                            ],
                            backgroundColor: "rgba(75, 192, 192, 0.6)",
                        },
                        {
                            label: "Запись",
                            data: [
                                analysis.writeErrors.fast || 0,
                                analysis.writeErrors.delayed || 0,
                                analysis.writeErrors.rewrites || 0,
                            ],
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
        result.temperature = parseInt(
            extractValue(data, /Current Drive Temperature:\s+(\d+)/),
            10
        ) || "Неизвестно";

        // Скорость вращения
        result.rotationRate = extractValue(data, /Rotation Rate:\s+(\d+)\s+rpm/) || "Неизвестно";

        // Интерфейс и скорость
        result.interface = extractValue(data, /Transport protocol:\s+(.+)\s+\(.*\)/) || "Неизвестно";
        result.linkRate = extractValue(
            data,
            /negotiated logical link rate: phy enabled;\s+(\d+)\s+Gbps/
        ) || "Неизвестно";

        // Тип подключения
        result.connectionType = extractValue(data, /attached device type:\s+(.+)$/m) || "Неизвестно";

        // Циклы включения/выключения
        result.startStopCyclesSpecified = extractValue(
            data,
            /Specified cycle count over device lifetime:\s+(\d+)/
        ) || "Неизвестно";
        result.startStopCyclesActual = extractValue(
            data,
            /Accumulated start-stop cycles:\s+(\d+)/
        ) || "Неизвестно";

        // Циклы загрузки/разгрузки головок
        result.loadUnloadCyclesSpecified = extractValue(
            data,
            /Specified load-unload count over device lifetime:\s+(\d+)/
        ) || "Неизвестно";
        result.loadUnloadCyclesActual = extractValue(
            data,
            /Accumulated load-unload cycles:\s+(\d+)/
        ) || "Неизвестно";

        // Ошибки чтения/записи
        const readErrorsMatch = data.match(/read:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([\d.]+)/);
        result.readErrors = readErrorsMatch
            ? {
                  fast: parseInt(readErrorsMatch[1], 10),
                  delayed: parseInt(readErrorsMatch[2], 10),
                  rewrites: parseInt(readErrorsMatch[3], 10),
                  gigabytesProcessed: parseFloat(readErrorsMatch[4]),
                  uncorrectedErrors: extractValue(data, /read:.+?\s+(\d+)$/m),
              }
            : {
                  fast: 0,
                  delayed: 0,
                  rewrites: 0,
                  gigabytesProcessed: 0,
                  uncorrectedErrors: 0,
              };

        const writeErrorsMatch = data.match(/write:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([\d.]+)/);
        result.writeErrors = writeErrorsMatch
            ? {
                  fast: parseInt(writeErrorsMatch[1], 10),
                  delayed: parseInt(writeErrorsMatch[2], 10),
                  rewrites: parseInt(writeErrorsMatch[3], 10),
                  gigabytesProcessed: parseFloat(writeErrorsMatch[4]),
                  uncorrectedErrors: extractValue(data, /write:.+?\s+(\d+)$/m),
              }
            : {
                  fast: 0,
                  delayed: 0,
                  rewrites: 0,
                  gigabytesProcessed: 0,
                  uncorrectedErrors: 0,
              };

        // Перераспределённые секторы
        result.reallocatedSectors = {
            inplace: countOccurrences(data, /Recovered via rewrite in-place/) || 0,
            app: countOccurrences(data, /Reassigned by app/) || 0,
        };

        // Результаты фонового сканирования
        result.backgroundScan = {
            status: extractValue(data, /Status:\s+(.+)$/m) || "Неизвестно",
            powerOnTime: extractValue(
                data,
                /Accumulated power on time,\s+hours:minutes\s+(\d+):(\d+)/
            ) || "Неизвестно",
            scansPerformed: extractValue(
                data,
                /Number of background scans performed:\s+(\d+)/
            ) || "Неизвестно",
            mediumScansPerformed: extractValue(
                data,
                /Number of background medium scans performed:\s+(\d+)/
            ) || "Неизвестно",
            scanProgress: extractValue(data, /scan progress:\s+(\d+.\d+)%/) || "Неизвестно",
        };

        // Журнал протокола SAS SSP
        result.sasSspLog = {
            port1: {
                invalidDwordCount: extractValue(
                    data,
                    /relative target port id = 1.*?Invalid DWORD count = (\d+)/ms
                ) || 0,
                disparityErrorCount: extractValue(
                    data,
                    /relative target port id = 1.*?Running disparity error count = (\d+)/ms
                ) || 0,
                lossSyncCount: extractValue(
                    data,
                    /relative target port id = 1.*?Loss of DWORD synchronization = (\d+)/ms
                ) || 0,
                phyResetProblemCount: extractValue(
                    data,
                    /relative target port id = 1.*?Phy reset problem = (\d+)/ms
                ) || 0,
            },
            port2: {
                invalidDwordCount: extractValue(
                    data,
                    /relative target port id = 2.*?Invalid DWORD count = (\d+)/ms
                ) || 0,
                disparityErrorCount: extractValue(
                    data,
                    /relative target port id = 2.*?Running disparity error count = (\d+)/ms
                ) || 0,
                lossSyncCount: extractValue(
                    data,
                    /relative target port id = 2.*?Loss of DWORD synchronization = (\d+)/ms
                ) || 0,
                phyResetProblemCount: extractValue(
                    data,
                    /relative target port id = 2.*?Phy reset problem = (\d+)/ms
                ) || 0,
            },
        };

        return result;
    }

    // Вспомогательные функции
    function extractValue(data, regex, port = 1) {
        const matches = data.split("relative target port id = ").map((section) =>
            section.match(regex)
        );
        return matches[port - 1]?.[1].trim() || null;
    }

    function convertCapacity(capacityStr) {
        if (!capacityStr) return "Неизвестно";
        const match = capacityStr.match(/(\d+\.\d+)\s*TB/);
        return match ? `${parseFloat(match[1]).toFixed(1)} TB` : "Неизвестно";
    }

    function countOccurrences(data, regex) {
        return (data.match(regex) || []).length;
    }
});
