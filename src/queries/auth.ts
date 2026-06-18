import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeProfileOnboarding,
  createUser,
  getCurrentProfile,
  getPlatformAuthSettings,
  getProfiles,
  updateProfile,
  updateProfileRole,
} from "../lib/auth";
import type { Department, Profile, UserRole, WorkRole } from "../types/user";
import { authKeys } from "./keys";

export function useCurrentProfile(enabled = true) {
  return useQuery({
    queryKey: authKeys.currentProfile(),
    queryFn: getCurrentProfile,
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

export function useProfiles(enabled = true) {
  return useQuery({
    queryKey: authKeys.profiles(),
    queryFn: getProfiles,
    staleTime: 60_000,
    enabled,
  });
}

export function usePlatformAuthSettings() {
  return useQuery({
    queryKey: authKeys.platformAuthSettings(),
    queryFn: getPlatformAuthSettings,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useUpdateProfileRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateProfileRole(id, role),
    onSuccess: (updated) => {
      qc.setQueryData<Profile>(authKeys.currentProfile(), (old) =>
        old?.id === updated.id ? { ...old, ...updated } : old,
      );
      qc.invalidateQueries({ queryKey: authKeys.profiles() });
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      work_role: WorkRole;
      department: Department;
      preferred_filters: string[];
      preferred_view: "welcome" | "tickets" | "board" | "dashboard";
    }) => completeProfileOnboarding(input),
    onSuccess: (updated) => {
      qc.setQueryData<Profile>(authKeys.currentProfile(), (old) =>
        old ? { ...old, ...updated } : (updated as Profile),
      );
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      qc.setQueryData<Profile>(authKeys.currentProfile(), (old) =>
        old ? { ...old, ...updated } : (updated as Profile),
      );
      qc.setQueryData<Profile[]>(authKeys.profiles(), (old) =>
        old?.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) =>
      createUser(name, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.profiles() });
    },
  });
}
