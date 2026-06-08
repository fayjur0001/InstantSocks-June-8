"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Search,
  RotateCcw,
  UserCog,
  UserPen,
  Lock,
  Ban,
  Play,
  ShieldOff,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { ReusableTable } from "@/components/tables/ReusableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditRoleModal } from "@/components/modals/EditRoleModal";
import { EditUserModal } from "@/components/modals/EditUserModal";
import { EditPasswordModal } from "@/components/modals/EditPasswordModal";
import { BanUserModal } from "@/components/modals/BanUserModal";
import { adminUsersService, type AdminUserApiItem } from "@/lib/admin-users.service";
import { useAuth } from "@/context/AuthContext";


// --- Interfaces ---
export interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  activity: string;
  status: "online" | "offline" | "banned" | "suspended";
  totalTopUp: number;
  currentBalance: number;
  lastLoginIp: string;
}

export interface FilterState {
  username: string;
  email: string;
  role: string;
  dateRange: DateRange | undefined;
  status: "all" | "online" | "banned" | "suspended";
}

const ITEMS_PER_PAGE = 10;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message);
    return parsed?.message || fallback;
  } catch {
    return error.message || fallback;
  }
};

const mapUser = (user: AdminUserApiItem): UserData => {
  let status: UserData["status"] = "offline";
  if (user.isOnline) {
    status = "online";
  } else if (user.banned) {
    status = "banned";
  } else if (user.bannedTill && new Date(user.bannedTill) > new Date()) {
    status = "suspended";
  }

  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
    activity: user.lastActivity
      ? format(new Date(user.lastActivity), "yyyy-MM-dd HH:mm:ss")
      : "-",
    status,
    totalTopUp: user.totalTopUp ?? 0,
    currentBalance: user.currentBalance ?? 0,
    lastLoginIp: "-",
  };
};

// --- Main Component ---
const OneTimeRentTable = () => {
  const { loginAs } = useAuth();
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    username: "",
    email: "",
    role: "all",
    dateRange: undefined,
    status: "all",
  });

  // Refs so loadUsers always reads latest values without stale closures
  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const handleResetFilters = () => {
    setPage(1);
    setFilters({
      username: "",
      email: "",
      role: "all",
      dateRange: undefined,
      status: "all",
    });
  };

  const loadUsers = useCallback(async (overridePage?: number, overrideFilters?: FilterState) => {
    const currentFilters = overrideFilters ?? filtersRef.current;
    const currentPage = overridePage ?? pageRef.current;

    setIsLoading(true);
    try {
      const data = await adminUsersService.getUsers({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        username: currentFilters.username,
        email: currentFilters.email,
        role: currentFilters.role,
        type: currentFilters.status,
      });

      setUsers(data.users.map(mapUser));
      setTotalItems(data.total ?? data.totalPage * ITEMS_PER_PAGE);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load users."));
      setUsers([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch whenever filters or page change
  useEffect(() => {
    loadUsers(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  // Patch a single user in local state immediately — no refetch needed.
  // The optimistic update IS the UI truth until the user navigates/filters again.
  const optimisticUpdate = (userId: string, patch: Partial<UserData>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );
  };

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalStates, setModalStates] = useState({
    role: false,
    edit: false,
    password: false,
  });
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banType, setBanType] = useState<"permanent" | "7days">("permanent");
  const [banTarget, setBanTarget] = useState<UserData | null>(null);

  const openModal = (user: UserData, type: "role" | "edit" | "password") => {
    setSelectedUser(user);
    setModalStates((prev) => ({ ...prev, [type]: true }));
  };

  const openBanModal = (user: UserData, type: "permanent" | "7days") => {
    setBanTarget(user);
    setBanType(type);
    setBanModalOpen(true);
  };

  const confirmBan = async () => {
    if (!banTarget) {
      setBanModalOpen(false);
      return;
    }
    const target = banTarget;
    setBanModalOpen(false);
    setBanTarget(null);

    try {
      await adminUsersService.banUser(target.id, banType === "7days");
      // Optimistic update — immediately reflect ban in UI without any refetch
      optimisticUpdate(target.id, {
        status: banType === "7days" ? "suspended" : "banned",
      });
      toast.success("User banned successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to ban user."));
      // On error, reload to restore true server state
      loadUsers();
    }
  };

  const handleUnban = async (user: UserData) => {
    // Optimistic update first — immediately swap ban icon to ban buttons in UI
    optimisticUpdate(user.id, { status: "offline" });

    try {
      await adminUsersService.unbanUser(user.id);
      toast.success(`${user.username} has been unbanned.`);
      // No loadUsers() here — optimistic update is the source of truth.
      // True server state loads on next filter/page change.
    } catch (error) {
      // On error, revert by reloading true server state
      toast.error(getApiErrorMessage(error, "Failed to unban user."));
      loadUsers();
    }
  };

  const handleRoleSave = async (role: "general" | "support" | "admin") => {
    if (!selectedUser) return;
    try {
      await adminUsersService.changeRole(selectedUser.id, role);
      optimisticUpdate(selectedUser.id, { role });
      toast.success("User role updated successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user role."));
      loadUsers();
    }
  };

  const handleUserSave = async (payload: { username: string; email: string }) => {
    if (!selectedUser) return;
    try {
      await adminUsersService.updateUser(
        selectedUser.id,
        payload.username,
        payload.email
      );
      optimisticUpdate(selectedUser.id, payload);
      toast.success("User updated successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user."));
      loadUsers();
    }
  };

  const handlePasswordSave = async (password: string) => {
    if (!selectedUser) return;
    try {
      await adminUsersService.changePassword(selectedUser.id, password);
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update password."));
    }
  };

  const handleLoginAs = async (user: UserData) => {
    try {
      // ✅ FIX: AuthContext.loginAs use করা হচ্ছে — এটা নিজেই user+balance+notifications fresh fetch করে
      await loginAs(user.id);
      // Full replace keeps /admin/users out of history after impersonation.
      // Browser Back will stay in the shadow user area.
      window.location.replace("/user/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to login as user."));
    }
  };

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: "id",
      header: "#",
      cell: ({ row }) => (
        <span className="text-c-slate-400">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => (
        <span className="font-medium text-c-slate-200">
          {row.original.username}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email Address",
      cell: ({ row }) => (
        <span className="text-c-slate-300">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="text-c-slate-300">{row.original.role}</span>
      ),
    },
    {
      accessorKey: "activity",
      header: "Activity",
      cell: ({ row }) => (
        <span className="text-c-slate-400 text-sm">{row.original.activity}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isOnline = row.original.status === "online";
        return (
          <div className="flex items-center w-full">
            <div
              className={cn(
                "w-3 h-3 rounded-full ml-4",
                isOnline
                  ? "bg-c-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : "bg-c-slate-600"
              )}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "totalTopUp",
      header: "Total Top Up",
      cell: ({ row }) => (
        <span className="text-c-slate-300 font-mono">
          $
          {row.original.totalTopUp.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Current Balance",
      cell: ({ row }) => {
        const balance = row.original.currentBalance;
        return (
          <span
            className={cn(
              "font-mono font-medium",
              balance > 0 ? "text-c-emerald-400" : "text-c-slate-500"
            )}
          >
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "lastLoginIp",
      header: "Last Login IP",
      cell: ({ row }) => (
        <span className="text-c-slate-400 font-mono text-sm">
          {row.original.lastLoginIp}
        </span>
      ),
    },
    {
      id: "settings",
      header: "Settings",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-green"
                  onClick={() => openModal(user, "role")}
                >
                  <UserCog className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Change Role</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-green"
                  onClick={() => openModal(user, "edit")}
                >
                  <UserPen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit User Details</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-green"
                  onClick={() => openModal(user, "password")}
                >
                  <Lock className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Change Password</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => {
        const user = row.original;
        const isBannedOrSuspended =
          user.status === "banned" || user.status === "suspended";

        return (
          <div className="flex items-center space-x-1">
            {isBannedOrSuspended ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-c-emerald-400"
                    onClick={() => handleUnban(user)}
                  >
                    <ShieldOff className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unban {user.username}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-c-rose-500"
                      onClick={() => openBanModal(user, "permanent")}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ban User Permanently</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-c-orange-500"
                      onClick={() => openBanModal(user, "7days")}
                    >
                      <span className="font-bold text-sm">7</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ban User for 7 Days</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-c-slate-400 hover:bg-white/10 hover:text-green"
                  onClick={() => handleLoginAs(user)}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Login as {user.username}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="bg-c-bg-700 border border-c-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Username..."
              value={filters.username}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, username: e.target.value });
              }}
              className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500"
            />

            <Input
              placeholder="Email address..."
              value={filters.email}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, email: e.target.value });
              }}
              className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500"
            />

            <Select
              value={filters.role}
              onValueChange={(val) => {
                setPage(1);
                setFilters({ ...filters, role: val });
              }}
            >
              <SelectTrigger className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-c-bg-700 border-c-slate-700 text-c-slate-200">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-c-bg-800 border-c-slate-700 hover:bg-c-bg-700 hover:text-c-slate-200",
                    !filters.dateRange && "text-c-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>All Time</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-c-bg-700 border-c-slate-700"
                align="start"
              >
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={(range) =>
                    setFilters({ ...filters, dateRange: range })
                  }
                  numberOfMonths={2}
                  className="text-c-slate-200"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
            <RadioGroup
              value={filters.status}
              onValueChange={(val: FilterState["status"]) => {
                setPage(1);
                setFilters({ ...filters, status: val });
              }}
              className="flex flex-wrap items-center space-x-4 text-c-slate-300"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="r-all" className="border-c-orange-500 text-c-orange-500" />
                <Label htmlFor="r-all" className="cursor-pointer">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="r-online" className="border-c-orange-500 text-c-orange-500" />
                <Label htmlFor="r-online" className="cursor-pointer">Online</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="banned" id="r-banned" className="border-c-orange-500 text-c-orange-500" />
                <Label htmlFor="r-banned" className="cursor-pointer">Banned</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suspended" id="r-suspended" className="border-c-orange-500 text-c-orange-500" />
                <Label htmlFor="r-suspended" className="cursor-pointer">Suspended</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Button
                onClick={() => {
                  setPage(1);
                  loadUsers(1, filters);
                }}
                className="flex-1 md:flex-none bg-c-emerald-500 hover:bg-c-emerald-600 text-white shadow-sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="destructive"
                className="flex-1 md:flex-none bg-c-rose-500/10 text-c-rose-500 hover:bg-c-rose-500/20 border border-c-rose-500/20 shadow-none"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReusableTable
        columns={columns}
        data={users}
        currentPage={page}
        setCurrentPage={setPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={totalItems}
        isLoading={isLoading}
      />

      <EditRoleModal
        user={selectedUser}
        open={modalStates.role}
        onOpenChange={(val) => setModalStates((p) => ({ ...p, role: val }))}
        onSave={handleRoleSave}
      />
      <EditUserModal
        user={selectedUser}
        open={modalStates.edit}
        onOpenChange={(val) => setModalStates((p) => ({ ...p, edit: val }))}
        onSave={handleUserSave}
      />
      <EditPasswordModal
        user={selectedUser}
        open={modalStates.password}
        onOpenChange={(val) => setModalStates((p) => ({ ...p, password: val }))}
        onSave={handlePasswordSave}
      />

      <BanUserModal
        user={banTarget}
        open={banModalOpen}
        banType={banType}
        onOpenChange={(open) => {
          setBanModalOpen(open);
          if (!open) setBanTarget(null);
        }}
        onConfirm={confirmBan}
      />
    </div>
  );
};

export default OneTimeRentTable;
