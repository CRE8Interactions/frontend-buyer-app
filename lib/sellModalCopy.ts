export function sellTicketsArePlural(count = 1): boolean {
  return count > 1;
}

export function sellConfirmTitle(count = 1): string {
  return sellTicketsArePlural(count)
    ? `You are about to list ${count} tickets`
    : "You are about to list 1 ticket";
}

export function sellRemovalLine(count = 1): string {
  return sellTicketsArePlural(count)
    ? "These tickets leave your account right away and return only if you remove the listing."
    : "This ticket leaves your account right away and returns only if you remove the listing.";
}

export function sellLoadingTitle(count = 1): string {
  return sellTicketsArePlural(count)
    ? "Listing your tickets…"
    : "Listing your ticket…";
}

export function sellSuccessTitle(count = 1): string {
  return sellTicketsArePlural(count)
    ? "Your tickets have been listed"
    : "Your ticket has been listed";
}

export function sellSuccessBody(count = 1): string {
  return sellTicketsArePlural(count)
    ? "These tickets left your account. Manage or remove the listing from My listings to get them back. Once they sell, they can't be returned."
    : "This ticket left your account. Manage or remove the listing from My listings to get it back. Once it sells, it can't be returned.";
}

export function sellRemoveTitle(): string {
  return "Remove this listing?";
}

export function sellRemoveBody(count = 1): string {
  return sellTicketsArePlural(count)
    ? "Removing this listing returns these tickets to your account. If the listing has already sold, it can't be removed."
    : "Removing this listing returns this ticket to your account. If the listing has already sold, it can't be removed.";
}

export function sellStayOnScreenLine(): string {
  return "Stay on this screen until listing finishes.";
}
