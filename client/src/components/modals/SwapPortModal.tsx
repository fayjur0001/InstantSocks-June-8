"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { ReusableTable } from "@/components/tables/ReusableTable";
import { ColumnDef } from "@tanstack/react-table";
import { proxyApi } from "@/lib/proxy.service";
import { toast } from "sonner";

export interface PortData {
  port: string;
  location: string;
  carrier: string;
  redialInterval: string;
  currentLeases: string;
  rentedFor: string;
}

interface SwapPortModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  targetPort?: string | null;
  onSwapSuccess?: (newPort: string) => void;
}

export const SwapPortModal = ({
  isOpen,
  setIsOpen,
  targetPort,
  onSwapSuccess,
}: SwapPortModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [ports, setPorts] = useState<PortData[]>([]);
  const [loading, setLoading] = useState(false);
  const [swappingPort, setSwappingPort] = useState<string | null>(null);

  
  
  
  
  const fetchAvailablePorts = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      
      
      const res = await proxyApi.getMyRentals(1, 50);
      if (res.success) {
        const portList: PortData[] = res.rentals
          .filter((r) => r.port !== targetPort) 
          .map((r) => ({
            port: r.port,
            location: `${r.state}, ${r.city}`,
            carrier: r.type,
            redialInterval: "10",
            currentLeases: "0",
            rentedFor: new Date(r.createdAt).toLocaleDateString(),
          }));
        setPorts(portList);
      }
    } catch {
      toast.error("Failed to load available ports");
    } finally {
      setLoading(false);
    }
  }, [isOpen, targetPort]);

  useEffect(() => {
    fetchAvailablePorts();
  }, [fetchAvailablePorts]);

  
  const filteredData = useMemo(() => {
    if (!searchQuery) return ports;
    return ports.filter((item) =>
      item.port.includes(searchQuery) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, ports]);

  
  const handleSwap = async (newPort: string) => {
    if (!targetPort) return;
    setSwappingPort(newPort);
    try {
      const res = await proxyApi.swapPort(targetPort, newPort);
      if (res.success) {
        toast.success(`Port swapped: ${targetPort} → ${newPort}`);
        onSwapSuccess?.(newPort);
        setIsOpen(false);
      } else {
        toast.error("Swap failed. Please try again.");
      }
    } catch {
      toast.error("Swap failed. Please try again.");
    } finally {
      setSwappingPort(null);
    }
  };

  
  const columns: ColumnDef<PortData>[] = [
    { accessorKey: "port", header: "Port" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "carrier", header: "Carrier" },
    { accessorKey: "redialInterval", header: "Redial Interval" },
    { accessorKey: "currentLeases", header: "Current leases" },
    { accessorKey: "rentedFor", header: "Rented for" },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const isSwapping = swappingPort === row.original.port;
        return (
          <Button
            size="sm"
            disabled={!!swappingPort}
            onClick={() => handleSwap(row.original.port)}
            className="bg-c-red-300 hover:bg-c-red-400 disabled:opacity-60 text-white font-medium flex items-center gap-1"
          >
            {isSwapping && <Loader2 size={12} className="animate-spin" />}
            Swap Port
          </Button>
        );
      },
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[96vw] sm:max-w-[900px] shadow-lg shadow-white/10 p-4 border border-white/20 bg-c-bg-700 [&>button]:hidden overflow-hidden">
        {}
        <div className="absolute right-4 top-4">
          <DialogClose asChild>
            <button className="text-c-green-600 hover:opacity-80 transition-opacity rounded-full bg-white/10 p-1 cursor-pointer">
              <X
                className="h-6 w-6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </button>
          </DialogClose>
        </div>

        <h2 className="text-18-medium-inter text-white">
          Please choose another port to replace{" "}
          <span className="text-c-red-300">{targetPort || "..."}</span> with
        </h2>

        {}
        <div className="relative w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-c-gray-400" />
          <Input
            placeholder="Search swap able port"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-c-bg-200 border-none text-white placeholder:text-c-gray-300 rounded-full focus-visible:ring-1 focus-visible:ring-c-green-600"
          />
        </div>

        {}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-c-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading available ports…</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-c-slate-500">
            <p className="text-sm">No available ports found</p>
          </div>
        ) : (
          
          <div className="max-h-[50vh] overflow-auto hide-scrollbar">
            <ReusableTable
              columns={columns}
              data={filteredData}
              currentPage={page}
              setCurrentPage={setPage}
              itemsPerPage={10}
              totalItems={filteredData.length}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};