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

// "suspended" filter option বাদ — শুধু all / online / banned
export interface FilterState {
  username: string;
  email: string;
  role: string;
  dateRange: DateRange | undefined;
  status: "all" | "online" | "banned";
}

const ITEMS_PER_PAGE = 10;
// Input debounce — 400ms পরে API call, keystroke-এ না
const DEBOUNCE_MS = 400;

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

  // draftFilters — input-এ যা type করা হচ্ছে (UI state, debounce হওয়ার আগে)
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    username: "",
    email: "",
    role: "all",
    dateRange: undefined,
    status: "all",
  });

  // appliedFilters — এটা দিয়ে actual API call হয়
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    username: "",
    email: "",
    role: "all",
    dateRange: undefined,
    status: "all",
  });

  // Refs so loadUsers always reads latest values without stale closures
  const appliedRef = useRef(appliedFilters);
  const pageRef = useRef(page);
  useEffect(() => { appliedRef.current = appliedFilters; }, [appliedFilters]);
  useEffect(() => { pageRef.current = page; }, [page]);

  // Debounce: username/email typing শেষ হলে appliedFilters update হবে
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyDebounced = useCallback((next: FilterState) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      setAppliedFilters(next);
    }, DEBOUNCE_MS);
  }, []);

  // role/status/date select করলে immediately apply (debounce নেই)
  const applyImmediate = useCallback((next: FilterState) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setPage(1);
    setAppliedFilters(next);
  }, []);

  const handleResetFilters = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const empty: FilterState = {
      username: "",
      email: "",
      role: "all",
      dateRange: undefined,
      status: "all",
    };
    setPage(1);
    setDraftFilters(empty);
    setAppliedFilters(empty);
  };

  const loadUsers = useCallback(async (overridePage?: number, overrideFilters?: FilterState) => {
    const currentFilters = overrideFilters ?? appliedRef.current;
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

  // appliedFilters বা page বদলালেই API call
  useEffect(() => {
    loadUsers(page, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page]);

  // Patch a single user in local state immediately — no refetch needed.
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
    const currentBanType = banType;
    const newStatus = currentBanType === "7days" ? "suspended" : "banned";

    // Modal আগেই বন্ধ করো
    setBanModalOpen(false);
    setBanTarget(null);

    // Filter active থাকলে (online বা all) — row-টা সাথে সাথে
    // status update করো; "banned" filter-এ থাকলে row remove করো না,
    // কারণ সে এখন banned হয়ে গেছে তাই filter-এ থাকবে।
    // "online" filter active থাকলে সে আর online না — row সরিয়ে দাও।
    const activeStatus = appliedRef.current.status;
    if (activeStatus === "online") {
      // "online" filter-এ এই user আর থাকবে না — remove করো
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } else {
      // "all" বা "banned" filter — status update করো
      optimisticUpdate(target.id, { status: newStatus });
    }

    try {
      await adminUsersService.banUser(target.id, currentBanType === "7days");
      toast.success(`${target.username} banned successfully.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to ban user."));
      loadUsers();
    }
  };

  const handleUnban = async (user: UserData) => {
    const activeStatus = appliedRef.current.status;

    // "banned" filter active থাকলে — unban করলে সে list থেকে সরে যাবে
    if (activeStatus === "banned") {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      // "all" বা "online" filter — status offline করো
      optimisticUpdate(user.id, { status: "offline" });
    }

    try {
      await adminUsersService.unbanUser(user.id);
      toast.success(`${user.username} has been unbanned.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to unban user."));
      loadUsers();
    }
  };

  const handleRoleSave = async (role: "general" | "support" | "admin") => {
    if (!selectedUser) return;
    await adminUsersService.changeRole(selectedUser.id, role);
    optimisticUpdate(selectedUser.id, { role });
    toast.success("User role updated successfully.");
  };

  const handleUserSave = async (payload: { username: string; email: string }) => {
    if (!selectedUser) return;
    // error re-throw — EditUserModal নিজেই catch করে inline দেখাবে
    await adminUsersService.updateUser(
      selectedUser.id,
      payload.username,
      payload.email
    );
    optimisticUpdate(selectedUser.id, payload);
    toast.success("User updated successfully.");
  };

  const handlePasswordSave = async (password: string) => {
    if (!selectedUser) return;
    // error re-throw — EditPasswordModal নিজেই catch করে inline দেখাবে
    await adminUsersService.changePassword(selectedUser.id, password);
    toast.success("Password updated successfully.");
  };

  const handleLoginAs = async (user: UserData) => {
    try {
      await loginAs(user.id);
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
        const status = row.original.status;
        const isOnline = status === "online";
        const isBanned = status === "banned";
        const isSuspended = status === "suspended";
        return (
          <div className="flex items-center w-full">
            <div
              className={cn(
                "w-3 h-3 rounded-full ml-4",
                isOnline    && "bg-c-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
                isBanned    && "bg-c-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
                isSuspended && "bg-c-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
                !isOnline && !isBanned && !isSuspended && "bg-c-slate-600"
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
            {/* Username — debounced */}
            <Input
              placeholder="Username..."
              value={draftFilters.username}
              onChange={(e) => {
                const next = { ...draftFilters, username: e.target.value };
                setDraftFilters(next);
                applyDebounced(next);
              }}
              className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500"
            />

            {/* Email — debounced */}
            <Input
              placeholder="Email address..."
              value={draftFilters.email}
              onChange={(e) => {
                const next = { ...draftFilters, email: e.target.value };
                setDraftFilters(next);
                applyDebounced(next);
              }}
              className="bg-c-bg-800 border-c-slate-700 text-c-slate-200 placeholder:text-c-slate-500"
            />

            {/* Role — immediate */}
            <Select
              value={draftFilters.role}
              onValueChange={(val) => {
                const next = { ...draftFilters, role: val };
                setDraftFilters(next);
                applyImmediate(next);
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

            {/* Date range — immediate */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-c-bg-800 border-c-slate-700 hover:bg-c-bg-700 hover:text-c-slate-200",
                    !draftFilters.dateRange && "text-c-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {draftFilters.dateRange?.from ? (
                    draftFilters.dateRange.to ? (
                      <>
                        {format(draftFilters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(draftFilters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(draftFilters.dateRange.from, "LLL dd, y")
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
                  defaultMonth={draftFilters.dateRange?.from}
                  selected={draftFilters.dateRange}
                  onSelect={(range) => {
                    const next = { ...draftFilters, dateRange: range };
                    setDraftFilters(next);
                    applyImmediate(next);
                  }}
                  numberOfMonths={2}
                  className="text-c-slate-200"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
            {/* Status filter — "suspended" বাদ */}
            <RadioGroup
              value={draftFilters.status}
              onValueChange={(val: FilterState["status"]) => {
                const next = { ...draftFilters, status: val };
                setDraftFilters(next);
                applyImmediate(next);
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
            </RadioGroup>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Button
                onClick={() => {
                  if (debounceTimer.current) clearTimeout(debounceTimer.current);
                  setPage(1);
                  setAppliedFilters({ ...draftFilters });
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