import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function shortLabel(point, index) {
  if (point.isAggregate) return point.label;
  const title = point.examTitle || point.label || "";
  const number = /(?:mock|exam|simulation|attempt|practice)\s*#?(\d+)/i.exec(title)?.[1];
  return number ? `Mock ${number}` : `Attempt ${index + 1}`;
}

function formatCompletedDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

export default function ProgressChart({ points }) {
  const scoredPoints = points.filter((point) => Number.isFinite(Number(point.score)) && point.score !== null && point.score !== "");
  const scores = scoredPoints.map((point) => Number(point.score));
  const minScore = scores.length ? Math.max(0, Math.min(...scores) - 10) : 0;
  const maxScore = scores.length ? Math.min(100, Math.max(100, Math.max(...scores) + 10)) : 100;
  const latestScore = scores.at(-1);
  const previousScore = scores.at(-2);
  const trend = scores.length > 1 ? latestScore - previousScore : null;

  const chartData = {
    labels: scoredPoints.map(shortLabel),
    datasets: [
      {
        label: "Score",
        data: scores,
        borderColor: "#2563eb",
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return "rgba(37, 99, 235, 0.12)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(37, 99, 235, 0.30)");
          gradient.addColorStop(1, "rgba(37, 99, 235, 0.02)");
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#003A6C",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="relative h-full min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">Completed attempts only</p>
        {trend !== null && (
          <p className={`rounded-full px-2.5 py-1 text-xs font-black ${trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% from previous attempt
          </p>
        )}
      </div>
      <div className="relative h-[calc(100%-2rem)] min-w-0">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: true, mode: "nearest" },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: false,
                external: ({ chart, tooltip }) => {
                  const parent = chart.canvas.parentNode;
                  let tooltipElement = parent.querySelector(".progress-chart-tooltip");
                  if (!tooltipElement) {
                    tooltipElement = document.createElement("div");
                    tooltipElement.className = "progress-chart-tooltip pointer-events-auto absolute z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl";
                    parent.appendChild(tooltipElement);
                  }
                  if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
                    tooltipElement.style.opacity = "0";
                    tooltipElement.style.pointerEvents = "none";
                    return;
                  }

                  const point = scoredPoints[tooltip.dataPoints[0].dataIndex];
                  tooltipElement.innerHTML = `
                    <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Exam Title</p>
                    <p class="mt-0.5 text-sm font-black text-slate-900">${escapeHtml(point.examTitle || point.label)}</p>
                    <div class="mt-2 space-y-1 text-xs text-slate-600">
                      <p><span class="font-bold text-slate-800">Score:</span> ${Number(point.score)} / 100</p>
                      <p><span class="font-bold text-slate-800">Date Completed:</span> ${escapeHtml(formatCompletedDate(point.takenAt))}</p>
                    </div>
                  `;
                  const edgePadding = 12;
                  const tooltipWidth = tooltipElement.offsetWidth;
                  const tooltipHeight = tooltipElement.offsetHeight;
                  const parentWidth = parent.clientWidth;
                  const isNearLeftEdge = tooltip.caretX < tooltipWidth / 2 + edgePadding;
                  const isNearRightEdge = tooltip.caretX > parentWidth - tooltipWidth / 2 - edgePadding;
                  const displayBelowPoint = tooltip.caretY < tooltipHeight + edgePadding;

                  tooltipElement.style.opacity = "1";
                  tooltipElement.style.pointerEvents = "auto";
                  tooltipElement.style.left = isNearLeftEdge ? `${edgePadding}px` : isNearRightEdge ? `${parentWidth - edgePadding}px` : `${tooltip.caretX}px`;
                  tooltipElement.style.top = `${tooltip.caretY}px`;
                  tooltipElement.style.transform = `${isNearLeftEdge ? "translate(0, " : isNearRightEdge ? "translate(-100%, " : "translate(-50%, "}${displayBelowPoint ? "14px)" : "-115%)"}`;
                }
              }
            },
            scales: {
              y: { min: minScore, max: maxScore, ticks: { callback: (value) => `${value}%` } },
              x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }
            }
          }}
        />
      </div>
    </div>
  );
}
