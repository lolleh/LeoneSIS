"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Shield, Users, Save, Check } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Label } from "@/client/components/ui/label";
import { cn } from "@/client/lib/utils";

const MENU_GROUPS = {
  Main: ["dashboard", "students", "staff"],
  Academic: ["courses", "scheduling", "attendance", "grades", "lesson-plans", "sections"],
  Operations: ["calendar", "notices", "admissions", "communication", "broadcast", "billing", "discipline"],
  System: ["reports", "settings", "profiles", "permissions", "rollover", "system-logs", "export", "rooms", "periods", "grade-levels"],
};

interface Profile {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

interface Permission {
  menuKey: string;
  canRead: boolean;
  canWrite: boolean;
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
}

export default function ProfilesPage() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({ name: "", description: "" });
  const [permissions, setPermissions] = useState<Record<string, { canRead: boolean; canWrite: boolean }>>({});

  const { data: profiles = [], isLoading: loadingProfiles } = api.rbac?.listProfiles?.useQuery() ?? { data: [], isLoading: false };
  const { data: profilePermissions = [] } = api.rbac?.getPermissions?.useQuery(
    { profileId: selectedProfile?.id ?? "" },
    { enabled: !!selectedProfile?.id }
  ) ?? { data: [] };
  const { data: profileUsers = [] } = api.rbac?.getProfileUsers?.useQuery(
    { profileId: selectedProfile?.id ?? "" },
    { enabled: !!selectedProfile?.id }
  ) ?? { data: [] };

  const allMenuKeys = Object.values(MENU_GROUPS).flat();

  const initPermissions = (perms: Permission[]) => {
    const map: Record<string, { canRead: boolean; canWrite: boolean }> = {};
    allMenuKeys.forEach((key) => {
      const existing = perms.find((p) => p.menuKey === key);
      map[key] = { canRead: existing?.canRead ?? false, canWrite: existing?.canWrite ?? false };
    });
    setPermissions(map);
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setTimeout(() => initPermissions(profilePermissions), 0);
  };

  const togglePermission = (menuKey: string, field: "canRead" | "canWrite") => {
    setPermissions((prev) => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], [field]: !prev[menuKey]?.[field] },
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profiles & Access Control"
        description="Manage user profiles and role-based permissions"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Panel - Profiles List */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Profiles</CardTitle>
              <CardDescription>{profiles.length} profiles</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setProfileForm({ name: "", description: "" });
                setEditProfile(null);
                setProfileFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingProfiles ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Shield className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No profiles yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {profiles.map((profile: Profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted",
                      selectedProfile?.id === profile.id && "bg-muted"
                    )}
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{profile.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.userCount} user{profile.userCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileForm({ name: profile.name, description: profile.description });
                          setEditProfile(profile);
                          setProfileFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(profile.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Permission Matrix */}
        <div className="space-y-6">
          {!selectedProfile ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">Select a profile</h3>
                <p className="text-sm text-muted-foreground">Choose a profile from the left to manage its permissions.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {selectedProfile.name}
                    </CardTitle>
                    <CardDescription>{selectedProfile.description || "Permission matrix"}</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      // api.rbac.updatePermissions.mutate({
                      //   profileId: selectedProfile.id,
                      //   permissions: Object.entries(permissions).map(([menuKey, perms]) => ({
                      //     menuKey,
                      //     ...perms,
                      //   })),
                      // });
                    }}
                  >
                    <Save className="h-4 w-4" /> Save Permissions
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Menu Key</TableHead>
                          <TableHead className="w-[100px] text-center">Can Read</TableHead>
                          <TableHead className="w-[100px] text-center">Can Write</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(MENU_GROUPS).map(([group, keys]) => (
                          <>
                            <TableRow key={`group-${group}`}>
                              <TableCell colSpan={3} className="bg-muted/50 font-semibold text-sm">
                                {group}
                              </TableCell>
                            </TableRow>
                            {keys.map((key) => (
                              <TableRow key={key}>
                                <TableCell className="font-mono text-sm">{key}</TableCell>
                                <TableCell className="text-center">
                                  <button
                                    onClick={() => togglePermission(key, "canRead")}
                                    className={cn(
                                      "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                      permissions[key]?.canRead
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-input bg-background hover:bg-muted"
                                    )}
                                  >
                                    {permissions[key]?.canRead && <Check className="h-3.5 w-3.5" />}
                                  </button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <button
                                    onClick={() => togglePermission(key, "canWrite")}
                                    className={cn(
                                      "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                      permissions[key]?.canWrite
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-input bg-background hover:bg-muted"
                                    )}
                                  >
                                    {permissions[key]?.canWrite && <Check className="h-3.5 w-3.5" />}
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Users with this profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Users with this Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profileUsers.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No users assigned to this profile.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {profileUsers.map((user: ProfileUser) => (
                        <div key={user.id} className="flex items-center gap-3 rounded-md border p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {user.name.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Profile Dialog */}
      <Dialog open={profileFormOpen} onOpenChange={(open) => { if (!open) { setProfileFormOpen(false); setEditProfile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProfile ? "Edit Profile" : "Create Profile"}</DialogTitle>
            <DialogDescription>{editProfile ? "Update profile details." : "Create a new user profile."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Teacher"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Brief description of this profile..."
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProfileFormOpen(false); setEditProfile(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (editProfile) {
                // api.rbac.updateProfile.mutate({ id: editProfile.id, ...profileForm });
              } else {
                // api.rbac.createProfile.mutate(profileForm);
              }
              setProfileFormOpen(false);
              setEditProfile(null);
            }}>
              {editProfile ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? Users with this profile will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              // api.rbac.deleteProfile.mutate({ id: deleteConfirm! });
              setDeleteConfirm(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
