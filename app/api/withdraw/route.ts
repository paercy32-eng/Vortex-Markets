// 👈 2. TIME WINDOW CHECK (9:30 AM - 5:00 PM EAT)
const now = new Date();
// Convert current UTC time to EAT (UTC+3)
const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
const eatHour = eatTime.getUTCHours();
const eatMinute = eatTime.getUTCMinutes();
const eatTotalMinutes = eatHour * 60 + eatMinute;

const openTimeMinutes = 9 * 60 + 30; // 9:30 AM = 570 minutes
const closeTimeMinutes = 17 * 60;    // 5:00 PM = 1020 minutes

if (eatTotalMinutes < openTimeMinutes || eatTotalMinutes >= closeTimeMinutes) {
  return NextResponse.json(
    { error: 'Withdrawals are only available between 9:30 AM and 5:00 PM EAT. Please try again during these hours.' },
    { status: 400 }
  );
}
