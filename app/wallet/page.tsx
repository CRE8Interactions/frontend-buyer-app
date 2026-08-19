import Wallet from "@/components/organisms/Wallet";

export const metadata = {
  title: "My Wallet | Blocktickets",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string; from?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Wallet
      initialScreen={sp?.login !== undefined ? "login" : "events"}
      returnTo={sp?.from || null}
    />
  );
}
