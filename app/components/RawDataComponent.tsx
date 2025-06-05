"use client";

import { useEffect, useState } from "react";
import { Input } from "@/app/components/ui/input";

interface RowData {
  [key: string]: string | number;
}

export default function RawDataComponent() {
  const [data, setData] = useState<RowData[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/raw-data");
      const json = await res.json();
      setData(json);
    };

    fetchData();
  }, []);

  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="mt-6">
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 text-left font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx} className="border-t">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-2 whitespace-nowrap">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-4 text-center text-gray-500"
                >
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}