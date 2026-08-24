import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminRequest, ApiRecord } from "../api/adminApi";

export const useAdminProfile = (fallbackRole = "Administrator") => {
  const [profile, setProfile] = useState<ApiRecord | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const requestInFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadProfile = useCallback(async (force = false) => {
    if (requestInFlightRef.current) return;
    if (!force && hasLoadedRef.current) return;

    requestInFlightRef.current = true;
    setLoadingProfile(true);
    try {
      const nextProfile = await adminRequest<ApiRecord>("/admin/me");
      setProfile(nextProfile);
      setProfileError("");
      hasLoadedRef.current = true;
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to load admin profile.");
    } finally {
      requestInFlightRef.current = false;
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const adminUser = useMemo(() => {
    if (!profile) return null;
    return profile.user && typeof profile.user === "object" ? (profile.user as ApiRecord) : profile;
  }, [profile]);

  const displayName = useMemo(
    () => String(adminUser?.displayName || adminUser?.username || "Olivia Martin"),
    [adminUser]
  );

  const profileRole = useMemo(
    () => String(adminUser?.role || fallbackRole),
    [adminUser, fallbackRole]
  );

  return {
    profile,
    adminUser,
    displayName,
    profileRole,
    loadingProfile,
    profileError,
    loadProfile,
  };
};
