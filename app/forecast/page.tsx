//elzGotThis
"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import BottomNav from "../components/BottomNav";
import AuthGuard from "../components/AuthGuard";
import Chart from "../components/Chart";
import { fetchForecastData, fetchForecastByDimension, fetchUniqueDimensionValues } from "@/lib/fetchForecastData";
import { cn } from "@/lib/utils";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface ForecastData {
  date: string;
  month: string;
  category: string;
  actual: number | null;
  forecast: number | null;
  is_future: boolean;
}

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [forecastPeriod, setForecastPeriod] = useState<number>(6);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Dimension filter states
  const [selectedDimension, setSelectedDimension] = useState<string>("overall");
  const [dimensionFilterValue, setDimensionFilterValue] = useState<string>("");
  const [debouncedDimensionFilterValue, setDebouncedDimensionFilterValue] = useState<string>("");
  const [uniqueDimensionValues, setUniqueDimensionValues] = useState<string[]>([]);
  const [fetchingUniqueValues, setFetchingUniqueValues] = useState<boolean>(false);

  // Debounce logic for dimensionFilterValue
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDimensionFilterValue(dimensionFilterValue);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [dimensionFilterValue]);

  // Fetch unique dimension values when selectedDimension changes
  useEffect(() => {
    const getUniqueValues = async () => {
      if (selectedDimension !== "overall") {
        setFetchingUniqueValues(true);
        try {
          const values = await fetchUniqueDimensionValues(selectedDimension);
          setUniqueDimensionValues(values);
          // Set initial filter value if only one option is available, or clear if none
          if (values.length === 1) {
            setDimensionFilterValue(values[0]);
          } else {
            setDimensionFilterValue("");
          }
        } catch (err) {
          console.error("Failed to fetch unique dimension values:", err);
          setUniqueDimensionValues([]);
          setError("Failed to load filter options.");
        } finally {
          setFetchingUniqueValues(false);
        }
      } else {
        setUniqueDimensionValues([]);
        setDimensionFilterValue("");
        setDebouncedDimensionFilterValue("");
      }
    };

    getUniqueValues();
  }, [selectedDimension]);

  // Consolidated useEffect for data fetching
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: ForecastData[];
        if (selectedDimension === "overall") {
          data = await fetchForecastData(forecastPeriod);
        } else {
          // Only fetch if debounced value is not empty when a dimension is selected
          if (!debouncedDimensionFilterValue) {
            setForecastData([]);
            setLoading(false);
            return;
          }
          data = await fetchForecastByDimension(
            selectedDimension,
            debouncedDimensionFilterValue,
            forecastPeriod
          );
        }
        setForecastData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        console.error("Failed to load forecast data:", err);
      } finally {
        setLoading(false);
      }
    };

    // Trigger data load only when relevant filters change and for dimension filters, when debounced value is present
    if (selectedDimension === "overall" || debouncedDimensionFilterValue) {
      loadData();
    } else {
      setForecastData([]); // Clear data if dimension filter is active but value is empty
    }
  }, [forecastPeriod, selectedDimension, debouncedDimensionFilterValue]); // Added debouncedDimensionFilterValue

  // Memoized calculations for performance
  type ForecastMemoResult = {
    availableYears: number[];
    availableCategories: string[];
    filteredData: ForecastData[];
    chartData: {
      month: string;
      actual: number | null;
      forecast: number | null;
      is_future: boolean;
    }[];
    stats: {
      avgHistorical: number;
      growthPercentage: number;
      nextMonthForecast: number | null;
      nextMonth: string | null;
      historicalCount: number;
    };
  };

  const {
    availableYears,
    availableCategories,
    filteredData,
    chartData,
    stats,
  }: ForecastMemoResult = useMemo((): ForecastMemoResult => {
    const data = forecastData ?? [];
    if (!data.length) {
      return {
        availableYears: [],
        availableCategories: [],
        filteredData: [],
        chartData: [],
        stats: { avgHistorical: 0, growthPercentage: 0, nextMonthForecast: null, nextMonth: null, historicalCount: 0 }
      };
    }

    // Sort data chronologically by date first
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    const allDates = sortedData.map(item => new Date(item.date));
    const years = Array.from(
      new Set(
        allDates
          .filter(date => !isNaN(date.getFullYear()))
          .map(date => date.getFullYear())
      )
    ).sort((a, b) => a - b);

    const categories = Array.from(new Set(sortedData.map(item => item.category))).sort();

    const filtered = sortedData.filter(item => {
      if (!item.date) return false;
      const date = new Date(item.date);
      if (isNaN(date.getTime())) return false;

      const yearMatch = selectedYear === "all" || date.getFullYear().toString() === selectedYear;
      const categoryMatch = selectedCategory === "all" || item.category === selectedCategory;

      if (item.is_future) {
        const startDateMatchForFuture = !startDate || date >= startDate;
        return yearMatch && categoryMatch && startDateMatchForFuture;
      } else {
        const dateMatch =
          (!startDate || date >= startDate) && (!endDate || date <= endDate);
        return yearMatch && categoryMatch && dateMatch;
      }
    });

    // Grouping will naturally maintain chronological order if input is sorted
    const grouped = filtered.reduce((acc, item) => {
      if (!item.month || !item.date) return acc;

      // Use a full date string or timestamp as a key to ensure uniqueness per month and year
      // For charting, we care about 'month' string, but for sorting, we need the actual date.
      // We can use the date as a sort key, and month as display key.
      const monthYearKey = new Date(item.date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!acc[monthYearKey]) {
        acc[monthYearKey] = {
          displayMonth: item.month, // This is for display, e.g., "Jan'24"
          actual: 0,
          forecast: 0,
          count: 0,
          is_future: item.is_future,
          sortDate: new Date(item.date).getTime() // For actual chronological sorting
        };
      }

      if (item.actual !== null && typeof item.actual === "number") {
        acc[monthYearKey].actual += item.actual;
      }

      if (item.forecast !== null && typeof item.forecast === "number") {
        acc[monthYearKey].forecast += item.forecast;
      }

      acc[monthYearKey].count += 1;
      return acc;
    }, {} as Record<string, {
      displayMonth: string;
      actual: number;
      forecast: number;
      count: number;
      is_future: boolean;
      sortDate: number; // Timestamp for sorting
    }>);

    const chart = Object.values(grouped)
      .map(item => ({
        month: item.displayMonth, // Use displayMonth for chart x-axis label
        actual: item.count > 0 ? (item.actual / item.count) : null,
        forecast: item.count > 0 ? (item.forecast / item.count) : null,
        is_future: item.is_future,
        sortDate: item.sortDate // Retain for sorting
      }))
      .sort((a, b) => a.sortDate - b.sortDate); // Sort by the actual date timestamp

    const historicalForStats = chart.filter(item => !item.is_future);
    const forecastOnlyForStats = chart.filter(item => item.is_future);

    const totalHistorical = historicalForStats.reduce((sum, item) => sum + (item.actual || 0), 0);
    const avgHistorical = historicalForStats.length > 0 ? totalHistorical / historicalForStats.length : 0;

    let growthPercentage = 0;
    if (
      historicalForStats.length > 0 &&
      forecastOnlyForStats.length > 0 &&
      forecastOnlyForStats[0].forecast !== null &&
      historicalForStats[historicalForStats.length - 1].actual !== null &&
      historicalForStats[historicalForStats.length - 1].actual !== 0
    ) {
      growthPercentage = (
        ((forecastOnlyForStats[0].forecast as number) - (historicalForStats[historicalForStats.length - 1].actual as number)) /
        (historicalForStats[historicalForStats.length - 1].actual as number)
      ) * 100;
    }

    return {
      availableYears: years,
      availableCategories: categories,
      filteredData: filtered, // Keep filteredData sorted chronologically
      chartData: chart,
      stats: {
        avgHistorical,
        growthPercentage,
        nextMonthForecast: forecastOnlyForStats.length > 0 ? forecastOnlyForStats[0].forecast : null,
        nextMonth: forecastOnlyForStats.length > 0 ? forecastOnlyForStats[0].month : null,
        historicalCount: historicalForStats.length
      }
    };
  }, [forecastData, selectedYear, selectedCategory, startDate, endDate]);

  const handleDimensionFilterValueChange = useCallback((e: React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLInputElement>) => {
    setDimensionFilterValue(e.target.value);
  }, []);


  return (
    <AuthGuard>
     <header
      className="py-4"
      style={{
        backgroundColor: "#0D1F66",
        backgroundImage: "url('../media/bg-image.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <img
        src="../media/logo.png"
        alt="BuyTicket Logo"
        className="img-fluid mb-2"
        style={{ paddingLeft: "2rem", height: "auto", width: "300px" }}
      />
      <h1
        style={{ fontSize: "3em", paddingRight: "1em", color: "whitesmoke", textAlign: "right" }}
      >
        Sales Dashboard
      </h1>
    </header>
      <div className="container mx-auto px-4 py-6 min-h-screen bg-gray-50 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range (Historical)
                </label>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={startDate}
                    onChange={date => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    placeholderText="Start Date"
                    className="border rounded px-3 py-2 w-full text-sm"
                    maxDate={endDate || new Date()}
                  />
                  <DatePicker
                    selected={endDate}
                    onChange={date => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || undefined}
                    placeholderText="End Date"
                    className="border rounded px-3 py-2 w-full text-sm"
                    maxDate={new Date()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((year: number) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forecast Period
                </label>
                <select
                  value={forecastPeriod}
                  onChange={e => setForecastPeriod(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {[3, 6, 9, 12].map(num => (
                    <option key={num} value={num}>{num} months</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter By
                </label>
                <select
                  value={selectedDimension}
                  onChange={(e) => {
                    setSelectedDimension(e.target.value);
                    setDimensionFilterValue(""); // Reset filter value when dimension changes
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="overall">Overall</option>
                  <option value="Sector">Sector</option>
                  <option value="Airline">Airline</option>
                  <option value="Ag Company">Agent Company</option>
                </select>
              </div>

              {selectedDimension !== "overall" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedDimension} Value
                  </label>
                  {fetchingUniqueValues ? (
                    <div className="w-full border rounded px-3 py-2 text-sm text-gray-500">Loading options...</div>
                  ) : uniqueDimensionValues.length > 0 ? (
                    <select
                      value={dimensionFilterValue}
                      onChange={handleDimensionFilterValueChange}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Select a {selectedDimension}</option>
                      {uniqueDimensionValues.map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={dimensionFilterValue}
                      onChange={handleDimensionFilterValueChange}
                      placeholder={`Enter ${selectedDimension}`}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Historical Average</h3>
                <p className="text-3xl font-bold text-blue-600">
                  ${stats.avgHistorical.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.historicalCount} months data
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Projected Growth</h3>
                <p className={cn(
                  "text-3xl font-bold",
                  stats.growthPercentage >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {stats.growthPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  vs last historical month
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Next Month Forecast</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.nextMonthForecast !== null ? `$${stats.nextMonthForecast.toFixed(2)}` : "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.nextMonth || "No forecast available"}
                </p>
              </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                    {selectedDimension === "overall"
                      ? "Overall Revenue Forecast"
                      : `${selectedDimension}: ${dimensionFilterValue} Revenue Forecast`}
                </h2>
                <div className="text-sm text-gray-500">
                  {selectedYear === "all" ? "All Time" : `Year: ${selectedYear}`} |
                  Forecast: {forecastPeriod} months
                </div>
              </div>

              {chartData.length > 0 ? (
                 <Chart
                    data={chartData}
                    xKey="month"
                    yKey={["actual", "forecast"]}
                    type="composed"
                    colors={["#3b82f6", "#10b981"]}
                    labels={["Actual Revenue", "Forecasted Revenue"]}
                    className="h-[500px]"
                    title=""
                 />
              ) : (
                <div className="text-center py-10 text-gray-500">No data to display for the selected filters.</div>
              )}

              <div className="mt-4 flex justify-between text-sm text-gray-500">
                <div>
                  <span className="inline-block w-3 h-3 bg-blue-500 mr-1 rounded-sm"></span>
                  Actual Revenue
                </div>
                <div>
                  <span className="inline-block w-3 h-3 bg-green-500 mr-1 rounded-sm"></span>
                  Forecasted Revenue
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forecast
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.length > 0 ? filteredData.slice(0, 20).map((row: ForecastData) => (
                      <tr key={`${row.date}-${row.category}-${row.is_future}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.month || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.actual !== null ? `$${row.actual.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.forecast !== null ? `$${row.forecast.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.is_future ? "Projection" : "Historical"}
                        </td>
                      </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500">No data available.</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </AuthGuard>
  );
}