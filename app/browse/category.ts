import type { Cat } from "./data";

/* The API has no sport or category on an event, so it is read from the names. Shared by Browse and the team pages. */
const CATEGORY_RULES: [Cat, RegExp][] = [
  ["Hockey", /hockey|\bice\b|icedogs|bulls|buccaneers|saints|otters|capitols|spirit/i],
  ["Basketball", /basketball|\bwbb\b|\bmbb\b/i],
  ["MMA", /\bmma\b|boxing|cage|fight night/i],
  ["Football", /football|aggies vs|stadium/i],
  ["Baseball", /baseball|raptors/i],
  ["Soccer", /soccer/i],
  ["Volleyball", /volleyball/i],
  ["Comedy", /comedy|stand-?up/i],
  ["Music", /concert|live at|tour|orchestra|band|music/i],
];
export const categoryFor = (text: string): Cat => CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? "Other";
