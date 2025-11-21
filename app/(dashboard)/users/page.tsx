"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Plus, Pencil, Trash2, User } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  telegramChatId: string | null;
  createdAt: string;
  updatedAt: string;
  driver: {
    id: string;
    status: string;
    licenseNumber: string;
  } | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) {
        params.set("q", search.trim());
      }

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju korisnika");
      }

      setUsers(data.users);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju korisnika");
      }

      // Osvježi listu korisnika
      fetchUsers();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700";
      case "DISPATCHER":
        return "bg-blue-100 text-blue-700";
      case "DRIVER":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrator";
      case "DISPATCHER":
        return "Dispatcher";
      case "DRIVER":
        return "Vozač";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-dark-500">Učitavanje korisnika...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const roleStats = users.reduce(
    (acc, user) => {
      if (user.role === "DRIVER") acc.drivers += 1;
      if (user.role === "DISPATCHER") acc.dispatchers += 1;
      if (user.role === "ADMIN") acc.admins += 1;
      if (user.driver) acc.withDriverProfile += 1;
      return acc;
    },
    { drivers: 0, dispatchers: 0, admins: 0, withDriverProfile: 0 }
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={User}
        title="Korisnici"
        subtitle="Upravljajte korisničkim nalozima, rolama i pristupima u sistemu."
        actions={
          <button
            onClick={() => router.push("/users/new")}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-white/15 bg-white/5 text-dark-50 font-semibold hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj korisnika
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno korisnika
            </p>
            <p className="text-2xl font-bold mt-1">{totalUsers}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Administratori
            </p>
            <p className="text-2xl font-bold mt-1">{roleStats.admins}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Dispečeri
            </p>
            <p className="text-2xl font-bold mt-1">{roleStats.dispatchers}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Vozači (profil)
            </p>
            <p className="text-2xl font-bold mt-1">{roleStats.withDriverProfile}</p>
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Pretraži po imenu, prezimenu ili emailu..."
            className="w-full md:w-80 rounded-full border border-dark-200 bg-white px-4 py-3 text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setLoading(true);
                setPage(1);
                fetchUsers();
              }
            }}
          />
          <Button
            onClick={() => {
              setLoading(true);
              setPage(1);
              fetchUsers();
            }}
            className="rounded-full"
          >
            Primijeni filtere
          </Button>
        </div>
        <p className="text-sm text-dark-500">
          Stranica {page} od {totalPages}
        </p>
      </div>

      {/* Users Table */}
      <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl">
        <CardHeader className="border-b border-dark-100 pb-4">
          <CardTitle className="text-2xl">Svi korisnici ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Korisnik
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Telefon
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Uloga
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Status vozača
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-dark-700">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-dark-100 hover:bg-dark-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-dark-600">{user.email}</td>
                    <td className="py-3 px-4 text-dark-600">
                      {user.phone || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.driver ? (
                        <span className="text-sm text-dark-600">
                          {user.driver.status === "ACTIVE" && "Aktivan"}
                          {user.driver.status === "INACTIVE" && "Neaktivan"}
                          {user.driver.status === "ON_VACATION" && "Na odmoru"}
                        </span>
                      ) : (
                        <span className="text-sm text-dark-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/users/${user.id}/edit`)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {deleteConfirm === user.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                            >
                              Potvrdi
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Odustani
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteConfirm(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                <p className="text-dark-500">Nema korisnika u sistemu</p>
              </div>
            )}
          </div>

          {users.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-dark-600">
              <span>
                Stranica {page} od {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    if (page > 1) {
                      setLoading(true);
                      setPage(page - 1);
                    }
                  }}
                >
                  Prethodna
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    if (page < totalPages) {
                      setLoading(true);
                      setPage(page + 1);
                    }
                  }}
                >
                  Sljedeća
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
