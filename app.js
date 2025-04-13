import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
} from "@mui/material";
import { Chart as ChartJS } from "chart.js/auto";
import { Bar } from "react-chartjs-2";

function App() {
  const [smartData, setSmartData] = useState(""); // Данные SMART из текстового поля
  const [results, setResults] = useState(null); // Результаты анализа
  const [error, setError] = useState(null); // Ошибки анализа
  const [activeTab, setActiveTab] = useState(0); // Активная вкладка

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
    const tabsContent = [
      {
        label: "Общая информация",
        content: (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Параметр</TableCell>
                  <TableCell>Значение</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Вендор</TableCell>
                  <TableCell>{analysis.vendor}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Модель</TableCell>
                  <TableCell>{analysis.product}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Объем</TableCell>
                  <TableCell>{analysis.capacity}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Серийный номер</TableCell>
                  <TableCell>{analysis.serialNumber}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Скорость вращения</TableCell>
                  <TableCell>{`${analysis.rotationRate} RPM`}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Интерфейс</TableCell>
                  <TableCell>{`${analysis.interface} (${analysis.linkRate} Gbps)`}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ),
      },
      {
        label: "Здоровье диска",
        content: (
          <Box>
            <Typography variant="body1" color={analysis.health !== "OK" ? "error" : "success"}>
              <strong>Здоровье:</strong>{" "}
              {analysis.health === "OK"
                ? "Диск здоров."
                : `Критическая проблема: диск не здоров (${analysis.health}).`}
            </Typography>
            <Typography variant="body1" color={typeof analysis.temperature === "number" && analysis.temperature > 60 ? "warning" : ""}>
              <strong>Температура:</strong>{" "}
              {typeof analysis.temperature === "number" && analysis.temperature > 60
                ? `Высокая температура: ${analysis.temperature}°C.`
                : `Нормальная температура: ${analysis.temperature}°C.`}
            </Typography>
          </Box>
        ),
      },
      {
        label: "Ошибки чтения/записи",
        content: (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Операция</TableCell>
                      <TableCell>ECC Fast</TableCell>
                      <TableCell>Delayed</TableCell>
                      <TableCell>Rewrites</TableCell>
                      <TableCell>Гигабайты обработано</TableCell>
                      <TableCell>Некорректируемые ошибки</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Чтение</TableCell>
                      <TableCell>{analysis.readErrors.fast}</TableCell>
                      <TableCell>{analysis.readErrors.delayed}</TableCell>
                      <TableCell>{analysis.readErrors.rewrites}</TableCell>
                      <TableCell>{parseFloat(analysis.readErrors.gigabytesProcessed).toFixed(3)} GB</TableCell>
                      <TableCell>{analysis.readErrors.uncorrectedErrors}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Запись</TableCell>
                      <TableCell>{analysis.writeErrors.fast}</TableCell>
                      <TableCell>{analysis.writeErrors.delayed}</TableCell>
                      <TableCell>{analysis.writeErrors.rewrites}</TableCell>
                      <TableCell>{parseFloat(analysis.writeErrors.gigabytesProcessed).toFixed(3)} GB</TableCell>
                      <TableCell>{analysis.writeErrors.uncorrectedErrors}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12}>
              <Bar
                data={{
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
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
        ),
      },
      {
        label: "Фоновое сканирование",
        content: (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Параметр</TableCell>
                  <TableCell>Значение</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Статус</TableCell>
                  <TableCell>{analysis.backgroundScan.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Накопленное время работы</TableCell>
                  <TableCell>{analysis.backgroundScan.powerOnTime} часов</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Количество выполненных сканирований</TableCell>
                  <TableCell>{analysis.backgroundScan.scansPerformed}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Прогресс последнего сканирования</TableCell>
                  <TableCell>{analysis.backgroundScan.scanProgress}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ),
      },
      {
        label: "Журнал SAS SSP",
        content: (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Параметр</TableCell>
                  <TableCell>Значение (Port 1)</TableCell>
                  <TableCell>Значение (Port 2)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Invalid DWORD Count</TableCell>
                  <TableCell>{analysis.sasSspLog.port1.invalidDwordCount}</TableCell>
                  <TableCell>{analysis.sasSspLog.port2.invalidDwordCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Disparity Error Count</TableCell>
                  <TableCell>{analysis.sasSspLog.port1.disparityErrorCount}</TableCell>
                  <TableCell>{analysis.sasSspLog.port2.disparityErrorCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Loss of Sync Count</TableCell>
                  <TableCell>{analysis.sasSspLog.port1.lossSyncCount}</TableCell>
                  <TableCell>{analysis.sasSspLog.port2.lossSyncCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Phy Reset Problem Count</TableCell>
                  <TableCell>{analysis.sasSspLog.port1.phyResetProblemCount}</TableCell>
                  <TableCell>{analysis.sasSspLog.port2.phyResetProblemCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ),
      },
    ];

    return tabsContent;
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Анализатор данных SMART
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={smartData}
          onChange={(e) => setSmartData(e.target.value)}
          placeholder="Вставьте данные SMART здесь..."
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" color="primary">
          Проанализировать
        </Button>
      </form>
      {error && <Alert severity="error">{error}</Alert>}
      {results && (
        <Box sx={{ mt: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="SMART tabs">
            {results.map((tab, index) => (
              <Tab key={index} label={tab.label} />
            ))}
          </Tabs>
          <Box sx={{ pt: 2 }}>
            {results[activeTab]?.content || <Typography>Нет данных.</Typography>}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default App;
