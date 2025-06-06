//elzGotThis
"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchRawData } from "@/lib/fetchRawData";
import BottomNav from "../components/BottomNav";
import AuthGuard from "../components/AuthGuard";
import Chart from "../components/Chart";
import { groupByField } from "@/lib/utils"; // Assuming this utility is robust
import type { SalesRawData as OrigSalesRawData } from "../types/supabase";

// Extend SalesRawData to ensure "Sales_Person" is a valid key
type SalesRawData = OrigSalesRawData & {
  Sales_Person?: string;
  Ag_Company?: string;
  Journey?: string; // For Domestic/International filtering
};

// Define the structure for global filters
interface GlobalFilters {
  year: string;
  month: string;
  product: string;
  airline: string;
  supplier: string;
  salesPerson: string; // Changed from agentName, refers to 'Agent Name' field
  agCompany: string;
  city: string;
  sector: string;
  txType: string; // Corresponds to 'Type' in SalesRawData
  journey: string; // For Domestic/International filtering
}

// Initial state for global filters
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
  const num = parseFloat(String(value ?? "0"));
  return isNaN(num) ? 0 : num;
};


export default function RawDataPage() {
  const [rawData, setRawData] = useState<SalesRawData[]>([]);
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>(initialGlobalFilters);
  const [selectedChart, setSelectedChart] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch initial raw data
  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      const raw = await fetchRawData();
      setRawData(raw || []); // Ensure rawData is always an array
      setIsLoading(false);
      if (!raw || raw.length === 0) {
        console.error("No data fetched from the database.");
      }
    };
    getData();
  }, []);

  // Memoize filter options to prevent re-calculation on every render
  const filterOptions = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return {
        years: [], months: [], products: [], airlines: [], suppliers: [],
        salesPersons: [], agCompanies: [], cities: [], sectors: [],
        txTypes: [], journeys: [],
      };
    }

    const getUniqueValues = (key: keyof SalesRawData, data: SalesRawData[] = rawData) =>
      Array.from(new Set(data.map(item => item[key]).filter(Boolean)))
           .sort() as string[];

    // Extract years: combines years from 'Month' (e.g., Jan'25) and 'TxDate' (e.g., 01/01/2025)
    const years = Array.from(
      new Set(
        rawData.flatMap(item => {
          const results: string[] = [];
          if (item.Month) {
            const parts = item.Month.split("'");
            if (parts.length === 2 && parts[1]) results.push(`20${parts[1]}`);
          }
          if (item.TxDate) {
            const parts = item.TxDate.split('/');
            if (parts.length === 3 && parts[2]) {
                 // Handle 2-digit or 4-digit year
                results.push(parts[2].length === 2 ? `20${parts[2]}` : parts[2]);
            }
          }
          return results;
        }).filter(Boolean)
      )
    ).sort((a,b) => parseInt(b) - parseInt(a)); // Sort descending

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return {
      years,
      months,
      products: getUniqueValues("Product"),
      airlines: getUniqueValues("Airline"),
      suppliers: getUniqueValues("Supplier"),
      salesPersons: getUniqueValues("Sales_Person"),
      agCompanies: getUniqueValues("Ag_Company"),
      cities: getUniqueValues("City"),
      sectors: getUniqueValues("Sector"),
      txTypes: getUniqueValues("Type"), 
      journeys: getUniqueValues("Journey"), // For Domestic/International
    };
  }, [rawData]);

  // Memoize processed data: apply global filters and generate chart groups
  const { chartGroups, totalRevenue, filteredDataCount } = useMemo<{
    chartGroups: Record<string, { key: string; value: any }[]>;
    totalRevenue: string;
    filteredDataCount: number;
  }>(() => {
    if (!rawData || rawData.length === 0) {
      return { chartGroups: {}, totalRevenue: "0.00", filteredDataCount: 0 };
    }

    let filtered = [...rawData];

    // Apply Year Filter
    if (globalFilters.year !== "all") {
      const selectedFullYear = globalFilters.year; 
      const selectedShortYear = selectedFullYear.slice(-2); 
      filtered = filtered.filter(item => {
        const monthMatch = item.Month?.endsWith(`'${selectedShortYear}`);
        const txDateParts = item.TxDate?.split('/');
        const txDateYear = txDateParts?.[txDateParts.length - 1];
        const txDateMatch = txDateYear === selectedFullYear || txDateYear === selectedShortYear;
        return monthMatch || txDateMatch;
      });
    }

    // Apply Month Filter 
    if (globalFilters.month !== "all") {
      filtered = filtered.filter(item => item.Month?.startsWith(globalFilters.month));
    }
    
    const applyFilter = (key: keyof SalesRawData, filterValue: string) => {
        if (filterValue !== "all" && filterValue !== "") {
            filtered = filtered.filter(item => item[key] === filterValue);
        }
    };

    applyFilter("Product", globalFilters.product);
    applyFilter("Airline", globalFilters.airline);
    applyFilter("Supplier", globalFilters.supplier);
    applyFilter("Sales_Person", globalFilters.salesPerson); // Filter by 'Agent Name' using salesPerson filter state
    applyFilter("Ag_Company", globalFilters.agCompany);
    applyFilter("City", globalFilters.city);
    applyFilter("Sector", globalFilters.sector);
    applyFilter("Type", globalFilters.txType); 
    applyFilter("Journey", globalFilters.journey);


    // Generate chart groups using the globally filtered data
    const newChartGroups = {
      RevenueByMonth: groupByField(filtered, "Month", "Revenue"),
      BookingsByTicketDate: groupByField(filtered, "TxDate", "Txid", true),
      RevenueByProduct: groupByField(filtered, "Product", "Revenue"),
      BookingsByProduct: groupByField(filtered, "Product", "Txid", true),
      RevenueByAirline: groupByField(filtered, "Airline", "Revenue"),
      BookingsByAirline: groupByField(filtered, "Airline", "Txid", true),
      RevenueBySupplier: groupByField(filtered, "Supplier", "Revenue"),
      // CommissionBySupplier: groupByField(filtered, "Supplier", "Commission"), // Removed
      RevenueBySalesPerson: groupByField(filtered, "Sales_Person", "Revenue"), // Added - uses 'Agent Name'
      RevenueByCompany: groupByField(filtered, "Ag_Company", "Revenue"),
      // CommissionByAgent: groupByField(filtered, "Agent Name", "Commission"), // Removed
      RevenueByCity: groupByField(filtered, "City", "Revenue"),
      BookingsBySector: groupByField(filtered, "Sector", "Txid", true),
      RevenueByJourneyType: groupByField(filtered, "Journey", "Revenue"), // Added
      RevenueByType: groupByField(filtered, "Type", "Revenue"), 
      PaxByType: groupByField(filtered, "Type", "Pax No"),     
      // RevenueByWebsite: groupByField(filtered, "Website", "Revenue"), // Removed
    };
    
    for (const key in newChartGroups) {
        if (Object.prototype.hasOwnProperty.call(newChartGroups, key)) {
            (newChartGroups as Record<string, any[]>)[key].sort(
                (a, b) => parseFloatSafe(b.value) - parseFloatSafe(a.value)
            );
        }
    }

    const currentTotalRevenue = filtered.reduce((sum, row) => {
      return sum + parseFloatSafe(row.Revenue);
    }, 0);

    return {
      chartGroups: newChartGroups,
      totalRevenue: currentTotalRevenue.toFixed(2),
      filteredDataCount: filtered.length,
    };
  }, [rawData, globalFilters]);

  const handleFilterChange = (filterName: keyof GlobalFilters, value: string) => {
    setGlobalFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const chartKeys = Object.keys(chartGroups);

  const renderChart = (title: string, dataForChart: any[]) => {
    return (
      <div key={title} className="bg-white shadow rounded-lg p-4 md:p-6 w-full">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          {title.replace(/([A-Z])/g, " $1")} 
        </h2>
        {dataForChart && dataForChart.length > 0 ? (
          <Chart title="" data={dataForChart} xKey="key" yKey="value" className="h-64 md:h-80" />
        ) : (
          <div className="text-center text-gray-500 py-10">No data for this view.</div>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
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
      <div className="min-h-screen p-3 md:p-6 pb-28 bg-gray-100 relative">
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Global Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year:</label>
              <select value={globalFilters.year} onChange={(e) => handleFilterChange("year", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Years</option>
                {filterOptions.years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month:</label>
              <select value={globalFilters.month} onChange={(e) => handleFilterChange("month", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Months</option>
                {filterOptions.months.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product:</label>
              <select value={globalFilters.product} onChange={(e) => handleFilterChange("product", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Products</option>
                {filterOptions.products.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Airline:</label>
              <select value={globalFilters.airline} onChange={(e) => handleFilterChange("airline", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Airlines</option>
                {filterOptions.airlines.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier:</label>
              <select value={globalFilters.supplier} onChange={(e) => handleFilterChange("supplier", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Suppliers</option>
                {filterOptions.suppliers.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {/* Sales Person Filter (was Agent Name) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person:</label>
              <select value={globalFilters.salesPerson} onChange={(e) => handleFilterChange("salesPerson", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Sales Persons</option>
                {filterOptions.salesPersons.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Company:</label>
              <select value={globalFilters.agCompany} onChange={(e) => handleFilterChange("agCompany", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Companies</option>
                {filterOptions.agCompanies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City:</label>
              <select value={globalFilters.city} onChange={(e) => handleFilterChange("city", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Cities</option>
                {filterOptions.cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector:</label>
              <select value={globalFilters.sector} onChange={(e) => handleFilterChange("sector", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Sectors</option>
                {filterOptions.sectors.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type:</label>
              <select value={globalFilters.txType} onChange={(e) => handleFilterChange("txType", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Types</option>
                {filterOptions.txTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {/* Journey Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Journey Type:</label>
              <select value={globalFilters.journey} onChange={(e) => handleFilterChange("journey", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Journey Types</option>
                {filterOptions.journeys.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {/* Website Filter was removed */}
          </div>
        </div>
        
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label className="mr-2 text-sm font-medium text-gray-700">Select Chart:</label>
            <select
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
          <p className="text-2xl font-bold">₹ {totalRevenue}</p>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}