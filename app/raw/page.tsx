"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchRawData } from "@/lib/fetchRawData";
import BottomNav from "../components/BottomNav";
import AuthGuard from "../components/AuthGuard";
import Chart from "../components/Chart";
import { groupByField } from "@/lib/utils";
import type { SalesRawData as OrigSalesRawData } from "../types/supabase";
// import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs"; // <-- REMOVE THIS
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'; // <-- ADD THIS

// Extend SalesRawData to ensure "Sales_Person" is a valid key for filtering
type SalesRawData = OrigSalesRawData & {
  Sales_Person?: string;
  Ag_Company?: string;
  Journey?: string; // For Domestic/International filtering
  // Add other expected properties from sales_raw_data here if needed for chart grouping
};

// Define the structure for global filters
interface GlobalFilters {
  year: string;
  month: string;
  product: string;
  airline: string;
  supplier: string;
  salesPerson: string; // This will be dynamically set based on login
  agCompany: string;
  city: string;
  sector: string;
  txType: string; // Corresponds to 'Type' in SalesRawData
  journey: string; // For Domestic/International filtering
}

// Initial state for global filters
// salesPerson is set to 'all' as a default, but will be overridden by login restriction
const initialGlobalFilters: GlobalFilters = {
  year: "all",
  month: "all",
  product: "all",
  airline: "all",
  supplier: "all",
  salesPerson: "all",
  agCompany: "all",
  city: "all",
  sector: "all",
  txType: "all",
  journey: "all",
};

// Helper to safely parse float
const parseFloatSafe = (value: any): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// Define the structure for grouped chart data
interface GroupedChartData {
  [key: string]: any; // e.g., { "Month": "Jan", "Revenue": 1200 }
}

interface ChartGroup {
  title: string;
  data: GroupedChartData[];
  xKey: string;
  yKey: string;
  type?: "bar" | "line" | "composed";
  colors?: string[];
  labels?: string[];
}

interface ChartGroups {
  [key: string]: ChartGroup;
}

export default function RawDataPage() {
  const supabase = useSupabaseClient(); // <-- GET SUPABASE CLIENT FROM CONTEXT
  const session = useSession(); // <-- GET SESSION FROM CONTEXT (useful for auth checks)

  const [rawData, setRawData] = useState<SalesRawData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalFilters, setGlobalFilters] =
    useState<GlobalFilters>(initialGlobalFilters);
  const [selectedChart, setSelectedChart] = useState<string>("All");

  // State for dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    years: ["all"],
    months: ["all"],
    products: ["all"],
    airlines: ["all"],
    suppliers: ["all"],
    salesPersons: ["all"],
    agCompanies: ["all"],
    cities: ["all"],
    sectors: ["all"],
    txTypes: ["all"],
    journeys: ["all"],
  });

  // Function to populate filter options based on fetched data
  const populateFilterOptions = useCallback((data: SalesRawData[]) => {
    function unique<T>(arr: T[]): T[] {
      return [...new Set(arr)].sort();
    }

    const years = unique(data.map(item => new Date(item.TxDate).getFullYear().toString()));
    const months = unique(data.map(item => new Date(item.TxDate).toLocaleString('en-US', { month: 'short' })));
    const products = unique(data.map(item => item.Product));
    const airlines = unique(data.map(item => item.Airline));
    const suppliers = unique(data.map(item => item.Supplier));
    const salesPersons = unique(data.map(item => item.Sales_Person)); // Assuming 'AgentName' from SalesRawData
    const agCompanies = unique(data.map(item => item.Ag_Company));
    const cities = unique(data.map(item => item.City));
    const sectors = unique(data.map(item => item.Sector));
    const txTypes = unique(data.map(item => item.Type));
    // Assuming 'Journey' is a direct field on SalesRawData or needs to be derived
    const journeys = unique(data.map(item => item.Journey || 'N/A')); // Adjust if 'Journey' is not directly available

    setFilterOptions({
      years: ["all", ...years],
      months: ["all", ...months],
      products: ["all", ...products],
      airlines: ["all", ...airlines],
      suppliers: ["all", ...suppliers],
      salesPersons: ["all", ...salesPersons.filter((p): p is string => typeof p === "string" && p !== undefined)],
      agCompanies: ["all", ...agCompanies.filter((c): c is string => typeof c === "string" && c !== undefined)],
      cities: ["all", ...cities],
      sectors: ["all", ...sectors],
      txTypes: ["all", ...txTypes],
      journeys: ["all", ...journeys],
    });
  }, []);


  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      console.log("Attempting to load data...");
      try {
        if (!supabase) {
          console.warn("Supabase client not available yet.");
          // This should ideally not happen if SessionContextProvider is correctly wrapping the app.
          // You might want to handle this as a loading state or error.
          setLoading(false);
          return;
        }

        // fetchRawData now takes the supabase client
        const fetchedData = await fetchRawData(supabase);
        console.log("--- Fetched Data Raw ---", fetchedData); // Log the raw fetched data
        if (fetchedData.length > 0) {
          setRawData(fetchedData);
          populateFilterOptions(fetchedData);
          // Set initial salesPerson filter based on logged-in user's profile if available
          if (session?.user?.id) {
            // This part might need adjustment based on how 'Sales_Person' is linked to user.
            // For now, assume fetchRawData handles user-specific filtering.
            // If you need to set a filter based on the *current* user's salesPerson,
            // fetchRawData might need to return that specific salesPerson value.
            // Or you can derive it from the fetched data if all data is already filtered.
          }
        } else {
          console.warn("No raw data fetched from Supabase.");
          setRawData([]); // Ensure rawData is empty if no data
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch data.");
        console.error("Error fetching raw data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (supabase && session) { // Ensure both supabase client and session are available
      console.log("Supabase client and session are ready. Calling loadData().");
      loadData();
    } else {
        console.log("Waiting for Supabase client or session to be ready...");
    }
  }, [supabase, session, populateFilterOptions]); // Add session to dependencies

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      console.log("filteredData: No raw data available to filter.");
      return [];
    }

    console.log("filteredData: Applying filters:", globalFilters);

    const data = rawData.filter((item) => {
      const txDate = new Date(item.TxDate);
      const itemMonth = txDate.toLocaleString('en-US', { month: 'short' });
      const itemYear = txDate.getFullYear().toString();

      return (
        (globalFilters.year === "all" || itemYear === globalFilters.year) &&
        (globalFilters.month === "all" || itemMonth === globalFilters.month) &&
        (globalFilters.product === "all" || item.Product === globalFilters.product) &&
        (globalFilters.airline === "all" || item.Airline === globalFilters.airline) &&
        (globalFilters.supplier === "all" || item.Supplier === globalFilters.supplier) &&
        (globalFilters.salesPerson === "all" || item.Sales_Person === globalFilters.salesPerson) && // Assuming 'AgentName' is the field for sales person
        (globalFilters.agCompany === "all" || item.Ag_Company === globalFilters.agCompany) &&
        (globalFilters.city === "all" || item.City === globalFilters.city) &&
        (globalFilters.sector === "all" || item.Sector === globalFilters.sector) &&
        (globalFilters.txType === "all" || item.Type === globalFilters.txType) &&
        (globalFilters.journey === "all" || item.Journey === globalFilters.journey)
      );
    });
    console.log(`filteredData: Result - ${data.length} records.`);
    return data;
  }, [rawData, globalFilters]);

  // Memoized chart groups
  const chartGroups = useMemo<ChartGroups>(() => {
    if (!filteredData || filteredData.length === 0) {
      console.log("chartGroups: No filtered data to create chart groups.");
      return {};
    }

    console.log("chartGroups: Creating chart groups...");

    const groups: ChartGroups = {
      TotalRevenueByMonth: {
        title: "Total Revenue by Month",
        data: groupByField(filteredData, "Month", "Revenue").map(({ key, value }) => ({ Month: key, Revenue: value })),
        xKey: "Month",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByAirline: {
        title: "Total Revenue by Airline",
        data: groupByField(filteredData, "Airline", "Revenue").map(({ key, value }) => ({ Airline: key, Revenue: value })),
        xKey: "Airline",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByProduct: {
        title: "Total Revenue by Product",
        data: groupByField(filteredData, "Product", "Revenue").map(({ key, value }) => ({ Product: key, Revenue: value })),
        xKey: "Product",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueBySupplier: {
        title: "Total Revenue by Supplier",
        data: groupByField(filteredData, "Supplier", "Revenue").map(({ key, value }) => ({ Supplier: key, Revenue: value })),
        xKey: "Supplier",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByCity: {
        title: "Total Revenue by City",
        data: groupByField(filteredData, "City", "Revenue").map(({ key, value }) => ({ City: key, Revenue: value })),
        xKey: "City",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueBySector: {
        title: "Total Revenue by Sector",
        data: groupByField(filteredData, "Sector", "Revenue").map(({ key, value }) => ({ Sector: key, Revenue: value })),
        xKey: "Sector",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByType: {
        title: "Total Revenue by Type",
        data: groupByField(filteredData, "Type", "Revenue").map(({ key, value }) => ({ Type: key, Revenue: value })),
        xKey: "Type",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByJourney: {
        title: "Total Revenue by Journey Type",
        data: groupByField(filteredData, "Journey", "Revenue").map(({ key, value }) => ({ Journey: key, Revenue: value })),
        xKey: "Journey",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueBySalesPerson: {
        title: "Total Revenue by Sales Person",
        data: groupByField(filteredData, "Sales_Person", "Revenue").map(({ key, value }) => ({ Sales_Person: key, Revenue: value })),
        xKey: "Sales_Person",
        yKey: "Revenue",
        type: "bar",
      },
      TotalRevenueByAgCompany: {
        title: "Total Revenue by Agency Company",
        data: groupByField(filteredData, "Ag_Company", "Revenue").map(({ key, value }) => ({ Ag_Company: key, Revenue: value })),
        xKey: "Ag_Company",
        yKey: "Revenue",
        type: "bar",
      },
    };
    console.log("chartGroups: Generated groups:", groups);
    return groups;
  }, [filteredData]);

  const chartKeys = useMemo(() => Object.keys(chartGroups), [chartGroups]);

  const totalRevenue = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + parseFloatSafe(item.Revenue), 0);
  }, [filteredData]);

  const filteredDataCount = filteredData.length;

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      setGlobalFilters((prevFilters) => ({
        ...prevFilters,
        [name]: value,
      }));
    },
    []
  );

  const renderChart = useCallback((key: string, group: ChartGroup) => {
    // Check if group.data is defined and has elements
    if (!group || !group.data || group.data.length === 0) {
      console.warn(`renderChart: No data for chart ${key}. Skipping.`);
      return <div key={key} className="text-center text-gray-500 py-4">No data available for {group?.title || key}.</div>;
    }

    console.log(`renderChart: Preparing to render chart ${key} with data:`, group.data, `xKey: ${group.xKey}, yKey: ${group.yKey}`);

    return (
      <Chart
        key={key}
        title={group.title}
        data={group.data}
        xKey={group.xKey}
        yKey={group.yKey}
        type={group.type as "bar" | "line" | "composed"}
        colors={group.colors}
      />
    );
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-xl text-gray-700">
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-600 text-center p-4">
        <p>Error: {error}</p>
        <p>Please ensure you are logged in and data is available.</p>
      </div>
    );
  }

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
      <div className="min-h-screen bg-gray-50 p-4 pb-20"> {/* Add pb-20 for bottom nav */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Sales Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {/* Year Filter */}
          <div className="flex flex-col">
            <label htmlFor="year" className="text-sm font-medium text-gray-700">Year:</label>
            <select
              id="year"
              name="year"
              value={globalFilters.year}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.years.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col">
            <label htmlFor="month" className="text-sm font-medium text-gray-700">Month:</label>
            <select
              id="month"
              name="month"
              value={globalFilters.month}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.months.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="flex flex-col">
            <label htmlFor="product" className="text-sm font-medium text-gray-700">Product:</label>
            <select
              id="product"
              name="product"
              value={globalFilters.product}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.products.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Airline Filter */}
          <div className="flex flex-col">
            <label htmlFor="airline" className="text-sm font-medium text-gray-700">Airline:</label>
            <select
              id="airline"
              name="airline"
              value={globalFilters.airline}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.airlines.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="flex flex-col">
            <label htmlFor="supplier" className="text-sm font-medium text-gray-700">Supplier:</label>
            <select
              id="supplier"
              name="supplier"
              value={globalFilters.supplier}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.suppliers.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Sales Person Filter (AgentName) */}
          <div className="flex flex-col">
            <label htmlFor="salesPerson" className="text-sm font-medium text-gray-700">Sales Person:</label>
            <select
              id="salesPerson"
              name="salesPerson"
              value={globalFilters.salesPerson}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.salesPersons.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Agency Company Filter (AgCompany) */}
          <div className="flex flex-col">
            <label htmlFor="agCompany" className="text-sm font-medium text-gray-700">Agency Company:</label>
            <select
              id="agCompany"
              name="agCompany"
              value={globalFilters.agCompany}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.agCompanies.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex flex-col">
            <label htmlFor="city" className="text-sm font-medium text-gray-700">City:</label>
            <select
              id="city"
              name="city"
              value={globalFilters.city}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.cities.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div className="flex flex-col">
            <label htmlFor="sector" className="text-sm font-medium text-gray-700">Sector:</label>
            <select
              id="sector"
              name="sector"
              value={globalFilters.sector}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.sectors.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter (Type) */}
          <div className="flex flex-col">
            <label htmlFor="txType" className="text-sm font-medium text-gray-700">Transaction Type:</label>
            <select
              id="txType"
              name="txType"
              value={globalFilters.txType}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.txTypes.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Journey Filter (Domestic/International) */}
          <div className="flex flex-col">
            <label htmlFor="journey" className="text-sm font-medium text-gray-700">Journey Type:</label>
            <select
              id="journey"
              name="journey"
              value={globalFilters.journey}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {filterOptions.journeys.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="flex items-center space-x-2">
            <label htmlFor="chart-select" className="text-sm font-medium text-gray-700">Select Chart:</label>
            <select
                id="chart-select"
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="All">All Charts</option>
                {chartKeys.map((key) => (
                <option key={key} value={key}>
                    {key.replace(/([A-Z])/g, " $1")}
                </option>
                ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 mt-2 sm:mt-0">
            Displaying {filteredDataCount} records based on current filters.
          </div>
        </div>

        {selectedChart === "All" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {chartKeys.map((key) => chartGroups[key] ? renderChart(key, chartGroups[key]) : null)}
          </div>
        ) : (
          chartGroups[selectedChart] ? renderChart(selectedChart, chartGroups[selectedChart]) : <div className="text-center text-gray-500 py-10">Chart data not available.</div>
        )}

        <div className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-10">
          <p className="text-sm font-medium">Total Revenue (Filtered):</p>
          <p className="text-2xl font-bold">₹ {totalRevenue.toLocaleString()}</p>
          <p className="text-sm font-medium">Filtered Records: {filteredDataCount}</p>
        </div>

      </div>
      <BottomNav />
    </AuthGuard>
  );
}