import React, { useState } from "react";
import "./App.css"; // Подключение стилей

function App() {
  const [smartData, setSmartData] = useState(""); // Данные SMART из текстового поля
  const [results, setResults] = useState(null); // Результаты анализа
  const [error, setError] = useState(null); // Ошибки анализа

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
    result.temperature = parseInt(extractValue(data, /Current Drive Temperature:\s+(\d+)/), 10) || "Неизвестно";

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
          fast: parseInt(readErrorsMatch[1], 10),
          delayed: parseInt(readErrorsMatch[2], 10),
          rewrites: parseInt(readErrorsMatch[3], 10),
          gigabytesProcessed: parseFloat(readErrorsMatch[4]),
          uncorrectedErrors: extractValue(data, /read:.+?\s+(\d+)$/m),
        }
      : { fast: 0, delayed: 0, rewrites: 0, gigabytesProcessed: 0, uncorrectedErrors: 0 };

    const writeErrorsMatch = data.match(/write:\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([\d.]+)/);
    result.writeErrors = writeErrorsMatch
      ? {
          fast: parseInt(writeErrorsMatch[1], 10),
          delayed: parseInt(writeErrorsMatch[2], 10),
          rewrites: parseInt(writeErrorsMatch[3], 10),
          gigabytesProcessed: parseFloat(writeErrorsMatch[4]),
          uncorrectedErrors: extractValue(data, /write:.+?\s+(\d+)$/m),
        }
      : { fast: 0, delayed: 0, rewrites: 0, gigabytesProcessed: 0, uncorrectedErrors: 0 };

    // Перераспределённые секторы
    result.reallocatedSectors = {
      inplace: countOccurrences(data, /Recovered via rewrite in-place/),
      app: countOccurrences(data, /Reassigned by app/),
    };

    // Результаты фонового сканирования
    result.backgroundScan = {
      status: extractValue(data, /Status:\s+(.+)$/m) || "Неизвестно",
      powerOnTime: extractValue(data, /Accumulated power on time,\s+hours:minutes\s+(\d+):(\d+)/) || "Неизвестно",
      scansPerformed: extractValue(data, /Number of background scans performed:\s+(\d+)/) || "Неизвестно",
      mediumScansPerformed: extractValue(data, /Number of background medium scans performed:\s+(\d+)/) || "Неизвестно",
      scanProgress: extractValue(data, /scan progress:\s+(\d+.\d+)%/) || "Неизвестно",
    };

    // Журнал протокола SAS SSP
    result.sasSspLog = {
      port1: {
        invalidDwordCount: extractValue(data, /relative target port id = 1.*?Invalid DWORD count = (\d+)/ms) || 0,
        disparityErrorCount: extractValue(data, /relative target port id = 1.*?Running disparity error count = (\d+)/ms) || 0,
        lossSyncCount: extractValue(data, /relative target port id = 1.*?Loss of DWORD synchronization = (\d+)/ms) || 0,
        phyResetProblemCount: extractValue(data, /relative target port id = 1.*?Phy reset problem = (\d+)/ms) || 0,
      },
      port2: {
        invalidDwordCount: extractValue(data, /relative target port id = 2.*?Invalid DWORD count = (\d+)/ms) || 0,
        disparityErrorCount: extractValue(data, /relative target port id = 2.*?Running disparity error count = (\d+)/ms) || 0,
        lossSyncCount: extractValue(data, /relative target port id = 2.*?Loss of DWORD synchronization = (\d+)/ms) || 0,
        phyResetProblemCount: extractValue(data, /relative target port id = 2.*?Phy reset problem = (\d+)/ms) || 0,
      },
    };

    return result;
  }

  // Форматирование результатов
  function formatResults(analysis) {
    let output = [];

    // Общая информация
    output.push(
      <table key="general-info">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Вендор</td>
            <td>{analysis.vendor}</td>
          </tr>
          <tr>
            <td>Модель</td>
            <td>{analysis.product}</td>
          </tr>
          <tr>
            <td>Объем</td>
            <td>{analysis.capacity}</td>
          </tr>
          <tr>
            <td>Серийный номер</td>
            <td>{analysis.serialNumber}</td>
          </tr>
          <tr>
            <td>Скорость вращения</td>
            <td>{analysis.rotationRate} RPM</td>
          </tr>
          <tr>
            <td>Интерфейс</td>
            <td>{`${analysis.interface} (${analysis.linkRate} Gbps)`}</td>
          </tr>
          <tr>
            <td>Тип подключения</td>
            <td>{analysis.connectionType}</td>
          </tr>
        </tbody>
      </table>
    );

    // Здоровье диска
    output.push(
      <p key="health" className={analysis.health !== "OK" ? "error" : ""}>
        <strong>Здоровье:</strong>{" "}
        {analysis.health === "OK"
          ? "Диск здоров."
          : `Критическая проблема: диск не здоров (${analysis.health}).`}
      </p>
    );

    // Температура
    if (typeof analysis.temperature === "number") {
      output.push(
        <p key="temperature" className={analysis.temperature > 60 ? "warning" : ""}>
          <strong>Температура:</strong>{" "}
          {analysis.temperature > 60
            ? `Высокая температура: ${analysis.temperature}°C.`
            : `Нормальная температура: ${analysis.temperature}°C.`}
        </p>
      );
    } else {
      output.push(<p key="temperature">Температура: Неизвестно.</p>);
    }

    // Таблица Error counter log
    output.push(
      <div key="error-log">
        <h3>Error counter log</h3>
        <table>
          <thead>
            <tr>
              <th>Операция</th>
              <th>ECC Fast</th>
              <th>Delayed</th>
              <th>Rewrites</th>
              <th>Гигабайты обработано</th>
              <th>Некорректируемые ошибки</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Чтение</td>
              <td>{analysis.readErrors.fast}</td>
              <td>{analysis.readErrors.delayed}</td>
              <td>{analysis.readErrors.rewrites}</td>
              <td>{parseFloat(analysis.readErrors.gigabytesProcessed).toFixed(3)} GB</td>
              <td>{analysis.readErrors.uncorrectedErrors}</td>
            </tr>
            <tr>
              <td>Запись</td>
              <td>{analysis.writeErrors.fast}</td>
              <td>{analysis.writeErrors.delayed}</td>
              <td>{analysis.writeErrors.rewrites}</td>
              <td>{parseFloat(analysis.writeErrors.gigabytesProcessed).toFixed(3)} GB</td>
              <td>{analysis.writeErrors.uncorrectedErrors}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    // Перераспределённые секторы
    output.push(
      <p key="reallocated-sectors">
        <strong>Перераспределённые секторы:</strong>{" "}
        {analysis.reallocatedSectors.inplace > 0 ||
        analysis.reallocatedSectors.app > 0
          ? `Через rewrite in-place: ${analysis.reallocatedSectors.inplace}, через reassignment by app: ${analysis.reallocatedSectors.app}.`
          : "Отсутствуют."}
      </p>
    );

    // Фоновое сканирование
    output.push(
      <table key="background-scan">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Статус</td>
            <td>{analysis.backgroundScan.status}</td>
          </tr>
          <tr>
            <td>Накопленное время работы</td>
            <td>{analysis.backgroundScan.powerOnTime} часов</td>
          </tr>
          <tr>
            <td>Количество выполненных сканирований</td>
            <td>{analysis.backgroundScan.scansPerformed}</td>
          </tr>
          <tr>
            <td>Количество выполненных сканирований поверхности</td>
            <td>{analysis.backgroundScan.mediumScansPerformed}</td>
          </tr>
          <tr>
            <td>Прогресс последнего сканирования</td>
            <td>{analysis.backgroundScan.scanProgress}%</td>
          </tr>
        </tbody>
      </table>
    );

    // Журнал протокола SAS SSP
    output.push(
      <table key="sas-log">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение (Port 1)</th>
            <th>Значение (Port 2)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Invalid DWORD Count</td>
            <td>{analysis.sasSspLog.port1.invalidDwordCount}</td>
            <td>{analysis.sasSspLog.port2.invalidDwordCount}</td>
          </tr>
          <tr>
            <td>Disparity Error Count</td>
            <td>{analysis.sasSspLog.port1.disparityErrorCount}</td>
            <td>{analysis.sasSspLog.port2.disparityErrorCount}</td>
          </tr>
          <tr>
            <td>Loss of Sync Count</td>
            <td>{analysis.sasSspLog.port1.lossSyncCount}</td>
            <td>{analysis.sasSspLog.port2.lossSyncCount}</td>
          </tr>
          <tr>
            <td>Phy Reset Problem Count</td>
            <td>{analysis.sasSspLog.port1.phyResetProblemCount}</td>
            <td>{analysis.sasSspLog.port2.phyResetProblemCount}</td>
          </tr>
        </tbody>
      </table>
    );

    return output;
  }

  // Обработка отправки формы
  function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    try {
      if (!smartData.trim()) throw new Error("Пожалуйста, вставьте данные SMART.");
      const analysis = analyzeSmartData(smartData);
      setResults(formatResults(analysis));
    } catch (err) {
      setError(err.message);
      setResults(null);
    }
  }

  // Вспомогательные функции
  function extractValue(data, regex, port = 1) {
    const matches = data.split("relative target port id = ").map((section) => section.match(regex));
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

  return (
    <div className="container">
      <h1>Анализатор данных SMART</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={smartData}
          onChange={(e) => setSmartData(e.target.value)}
          rows="15"
          cols="80"
          placeholder="Вставьте данные SMART здесь..."
        />
        <br />
        <button type="submit">Проанализировать</button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && <div id="results">{results}</div>}
    </div>
  );
}

export default App;
