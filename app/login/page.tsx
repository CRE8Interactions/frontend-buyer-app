import { Suspense } from "react";
import { Geist } from "next/font/google";
import { CSS } from "../concept/styles";
import { BR_CSS } from "../browse/styles";
import { LG_CSS } from "./styles";
import LoginClient from "./LoginClient";

const sans = Geist({ subsets: ["latin"], display: "swap" });

export default function LoginPage() {
  return (
    <div className={`n br lg ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + BR_CSS + LG_CSS }} />
      <main>
        <Suspense fallback={<div className="lg-stage" aria-busy="true" />}>
          <LoginClient />
        </Suspense>
      </main>
    </div>
  );
}
