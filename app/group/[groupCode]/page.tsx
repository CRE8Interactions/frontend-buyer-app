"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { fieldClass } from "@/lib/fieldValidation";
import { getGroupInvitation } from "@/lib/api";
import { formatEventWhen, imageUrl } from "@/lib/helpers";
import { GROUP_LOADER_MESSAGE } from "@/lib/loaderMessages";

const lightCard =
  "rounded-[20px] border border-[rgba(5,27,53,0.08)] bg-white text-[#051b35]";
const muted = "text-[#6e7180]";

type GroupInvite = {
  groupCode?: string;
  inviteLink?: string;
  event?: {
    data?: {
      attributes?: {
        name?: string;
        start?: string;
        image?: unknown;
        venue?: { data?: { attributes?: { name?: string; timezone?: string } } };
      };
    };
  };
  [key: string]: unknown;
};

export default function GroupManagePage() {
  const params = useParams<{ groupCode: string }>();
  const groupCode = params.groupCode;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GroupInvite | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<
    Array<{ id: string; name: string; status: string }>
  >([
    { id: "f1", name: "Alex Kim", status: "Going" },
    { id: "f2", name: "Jordan Lee", status: "Invited" },
  ]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!groupCode) return;
    let cancelled = false;
    getGroupInvitation(groupCode)
      .then((res) => {
        if (cancelled) return;
        const invite = res?.data?.data?.[0]?.attributes as GroupInvite | undefined;
        setData(invite || null);
        if (!invite) setError("Invitation not found.");
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this group invitation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupCode]);

  const event = data?.event?.data?.attributes;
  const venue = event?.venue?.data?.attributes;
  const inviteLink =
    data?.inviteLink ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/group/${groupCode}/`
      : `/group/${groupCode}/`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const addFriend = () => {
    const name = newName.trim();
    if (!name) return;
    setFriends((cur) => [
      ...cur,
      { id: `f-${Date.now()}`, name, status: "Invited" },
    ]);
    setNewName("");
  };

  // Group invites are a Blocktickets surface: hold the platform loader until
  // the invitation is on screen.
  if (loading) {
    return (
      <BrandedLoader
        fallback="blocktickets"
        message={GROUP_LOADER_MESSAGE}
      />
    );
  }

  return (
    <AppShell variant="light" search={false}>
      {error || !data ? (
        <div className={`${lightCard} mx-auto max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Group not found</h1>
          <p className={`mt-2 ${muted}`}>{error}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-xl pb-16 text-[#051b35]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">
            Group purchase
          </p>
          <h1 className="mt-2 text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.03em]">
            Manage your group
          </h1>
          <p className={`mt-2 text-[15px] ${muted}`}>
            Code <span className="font-semibold text-[#051b35]">{groupCode}</span>
          </p>

          <div className={`${lightCard} mt-8 overflow-hidden`}>
            {event?.image ? (
              <div className="aspect-[21/9] bg-[#f1f3f8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(event.image as never)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <div className="p-5">
              <p className="text-[18px] font-semibold">
                {event?.name || "Event"}
              </p>
              <p className={`mt-1 text-[14px] ${muted}`}>
                {[
                  formatEventWhen(event?.start, venue?.timezone),
                  venue?.name,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <div className={`${lightCard} mt-4 p-5`}>
            <p className="text-[14px] font-semibold">Invite link</p>
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className={`flex-1 text-[13px] ${fieldClass("light", false)}`}
              />
              <BrandedActionButton
                type="button"
                className="shrink-0 px-5"
                onClick={copyLink}
              >
                {copied ? "Copied" : "Copy"}
              </BrandedActionButton>
            </div>
          </div>

          <div className={`${lightCard} mt-4 p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold">Friends</p>
              <span className={`text-[13px] ${muted}`}>
                {friends.filter((f) => f.status === "Going").length + 1} going
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center justify-between text-[14px]">
                <span>You (host)</span>
                <span className="font-semibold">Going</span>
              </li>
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between text-[14px]"
                >
                  <span>{f.name}</span>
                  <span className={muted}>{f.status}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a friend name"
                className={fieldClass("light", false)}
              />
              <BrandedActionButton
                type="button"
                className="shrink-0 px-5"
                onClick={addFriend}
              >
                Add
              </BrandedActionButton>
            </div>
            <p className={`mt-3 text-[12px] ${muted}`}>
              Local manage UI — invite delivery APIs from the old app are not
              fully wired here yet.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
