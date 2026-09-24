import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";



export type Lang = "bn" | "en";

const dict = {
  appName: { bn: "ZB SYSTEM", en: "ZB SYSTEM" },
  appSubtitle: { bn: "কাউন্টার বুকিং ইনফরমেশন", en: "Counter Booking Information" },
  tagline: {
    bn: "বাংলাদেশের নির্ভরযোগ্য পরিবহন সেবা",
    en: "Bangladesh's trusted transport service",
  },
  language: { bn: "ভাষা", en: "Language" },
  signIn: { bn: "সাইন ইন", en: "Sign In" },
  signOut: { bn: "সাইন আউট", en: "Sign Out" },
  masterAdmin: { bn: "মাস্টার এডমিন", en: "Master Admin" },
  moderator: { bn: "মডারেটর", en: "Moderator" },
  bookingPoint: { bn: "বুকিং পয়েন্ট", en: "Booking Point" },
  email: { bn: "ইমেইল", en: "Email" },
  password: { bn: "পাসওয়ার্ড", en: "Password" },
  name: { bn: "নাম", en: "Name" },
  loginId: { bn: "আইডি", en: "ID" },
  pin: { bn: "পিন", en: "PIN" },
  createAdmin: { bn: "এডমিন তৈরি করুন", en: "Create Admin" },
  haveAccount: { bn: "একাউন্ট আছে? সাইন ইন করুন", en: "Have an account? Sign in" },
  needAccount: { bn: "নতুন মাস্টার এডমিন তৈরি করুন", en: "Create a new master admin" },
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  vehicles: { bn: "গাড়ি নাম্বার এড", en: "Add Vehicle Number" },
  bookingPoints: { bn: "বুকিং পয়েন্ট", en: "Booking Points" },
  scheduleBoard: { bn: "শিডিউল বোর্ড", en: "Schedule Board" },
  accounts: { bn: "একাউন্ট ব্যবস্থাপনা", en: "Account Management" },
  vehicleNumber: { bn: "গাড়ির নাম্বার", en: "Vehicle Number" },
  vehicleType: { bn: "গাড়ির ধরন", en: "Vehicle Type" },
  seatCount: { bn: "সিট সংখ্যা", en: "Seat Count" },
  note: { bn: "মন্তব্য", en: "Note" },
  group: { bn: "গ্রুপ", en: "Group" },
  supervisor: { bn: "সুপারভাইজার", en: "Supervisor" },
  database: { bn: "ডাটাবেইজ", en: "Database" },
  searchGroupHint: { bn: "গ্রুপ দিয়ে খুঁজুন", en: "Search by group" },
  groupVehicles: { bn: "গ্রুপের গাড়ি", en: "Vehicles in group" },
  groupTrips: { bn: "গ্রুপের ট্রিপ", en: "Trips in group" },
  allGroups: { bn: "সব গ্রুপ", en: "All groups" },
  staffAccounts: { bn: "আইডি ও পিন", en: "IDs & PINs" },
  pinHidden: { bn: "পিন গোপন (রিসেট করা যাবে)", en: "PIN hidden (resettable)" },
  code: { bn: "কোড", en: "Code" },
  address: { bn: "ঠিকানা", en: "Address" },
  phone: { bn: "ফোন", en: "Phone" },
  route: { bn: "রুট", en: "Route" },
  date: { bn: "তারিখ", en: "Date" },
  time: { bn: "সময়", en: "Time" },
  fare: { bn: "ভাড়া", en: "Fare" },
  seatsAvailable: { bn: "খালি সিট", en: "Seats Available" },
  status: { bn: "অবস্থা", en: "Status" },
  add: { bn: "যোগ করুন", en: "Add" },
  save: { bn: "সেভ", en: "Save" },
  edit: { bn: "এডিট", en: "Edit" },

  delete: { bn: "মুছুন", en: "Delete" },
  actions: { bn: "একশন", en: "Actions" },
  role: { bn: "ভূমিকা", en: "Role" },
  createModerator: { bn: "মডারেটর তৈরি", en: "Create Moderator" },
  createBookingPointAccount: { bn: "বুকিং পয়েন্ট আইডি তৈরি", en: "Create Booking Point ID" },
  select: { bn: "নির্বাচন করুন", en: "Select" },
  noData: { bn: "কোনো তথ্য নেই", en: "No data yet" },
  loading: { bn: "লোড হচ্ছে...", en: "Loading..." },
  saved: { bn: "সফলভাবে সংরক্ষণ হয়েছে", en: "Saved successfully" },
  deleted: { bn: "মুছে ফেলা হয়েছে", en: "Deleted" },
  nameMismatch: { bn: "নাম, আইডি বা পিন মিলেনি", en: "Name, ID or PIN does not match" },
  onlyMaster: { bn: "শুধু মাস্টার এডমিন এই কাজ করতে পারবে", en: "Only a master admin can do this" },
  totalVehicles: { bn: "মোট গাড়ি", en: "Total Vehicles" },
  totalPoints: { bn: "মোট বুকিং পয়েন্ট", en: "Total Booking Points" },
  totalSchedules: { bn: "মোট শিডিউল", en: "Total Schedules" },
  signedInAs: { bn: "লগইন করা আছেন", en: "Signed in as" },
  supervisors: { bn: "সুপারভাইজার", en: "Supervisors" },
  supervisorName: { bn: "সুপারভাইজারের নাম", en: "Supervisor Name" },
  seatBooking: { bn: "সিট বুকিং", en: "Seat Booking" },
  pointType: { bn: "পয়েন্টের ধরন", en: "Point Type" },
  masterPoint: { bn: "মাস্টার বুকিং পয়েন্ট", en: "Master Booking Point" },
  normalPoint: { bn: "সাধারণ বুকিং পয়েন্ট", en: "Normal Booking Point" },
  departureTime: { bn: "গাড়ি ছাড়ার সময়", en: "Departure Time" },
  createTrip: { bn: "ট্রিপ তৈরি করুন", en: "Create Trip" },
  trip: { bn: "ট্রিপ", en: "Trip" },
  selectTrip: { bn: "ট্রিপ নির্বাচন করুন", en: "Select a trip" },
  noTrips: { bn: "কোনো ট্রিপ নেই", en: "No trips yet" },
  seatPlan: { bn: "সিট প্ল্যান", en: "Seat Plan" },
  seatsSelected: { bn: "নির্বাচিত সিট", en: "Seats selected" },
  amount: { bn: "টাকার পরিমাণ", en: "Amount" },
  submit: { bn: "সাবমিট", en: "Submit" },
  booked: { bn: "বুকড", en: "Booked" },
  free: { bn: "খালি", en: "Free" },
  selected: { bn: "নির্বাচিত", en: "Selected" },
  driver: { bn: "ড্রাইভার", en: "Driver" },
  bookedSeats: { bn: "বুকড সিট", en: "Booked seats" },
  remainingSeats: { bn: "অবশিষ্ট সিট", en: "Remaining" },
  totalIncome: { bn: "মোট আয়", en: "Total income" },
  totalAmount: { bn: "মোট টাকা", en: "Total Amount" },
  vehicleTotal: { bn: "গাড়ির মোট টাকা", en: "Vehicle Total" },
  selectSeats: { bn: "অন্তত একটি সিট নির্বাচন করুন", en: "Select at least one seat" },
  noBookingPointLinked: {
    bn: "আপনার আইডির সাথে কোনো বুকিং পয়েন্ট যুক্ত নেই",
    en: "No booking point linked to your ID",
  },
  bookings: { bn: "বুকিং তালিকা", en: "Bookings" },
  seats: { bn: "সিট", en: "Seats" },
  designAndDevelopment: { bn: "ডিজাইন এন্ড ডেভেলপমেন্ট", en: "Design and Development" },
  developerName: { bn: "জায়েম ভুইয়া", en: "Zayem Bhuiya" },
  saAdmin: { bn: "এস এ এডমিন", en: "SA Admin" },
  roleLabel: { bn: "ভূমিকা", en: "Role" },
  login: { bn: "লগইন", en: "Login" },
  logout: { bn: "লগআউট", en: "Logout" },
  guest: { bn: "অতিথি", en: "Guest" },
  routes: { bn: "রুট এড", en: "Add Route" },
  addRoute: { bn: "রুট যোগ করুন", en: "Add Route" },
  routeName: { bn: "রুটের নাম", en: "Route Name" },
  fromPlace: { bn: "কোথা থেকে", en: "From" },
  toPlace: { bn: "কোথায়", en: "To" },
  confirmBooking: { bn: "বুকিং কনফার্ম করুন", en: "Confirm Booking" },
  myBookings: { bn: "আমার বুকিং", en: "My Bookings" },
  bookingHistory: { bn: "বুকিং হিস্ট্রি", en: "Booking History" },
  pending: { bn: "পেন্ডিং", en: "Pending" },
  confirmed: { bn: "কনফার্মড", en: "Confirmed" },
  cancelled: { bn: "বাতিল", en: "Cancelled" },
  confirm: { bn: "কনফার্ম", en: "Confirm" },
  cancel: { bn: "বাতিল করুন", en: "Cancel" },
  seatTaken: {
    bn: "সিটটি এই মুহূর্তে অন্য পয়েন্ট বুক করে ফেলেছে, অন্য সিট নির্বাচন করুন",
    en: "That seat was just booked by another point, please pick another",
  },
  masterPointOnlyTrip: {
    bn: "শুধু মাস্টার বুকিং পয়েন্ট ট্রিপ তৈরি করতে পারবে",
    en: "Only a master booking point can create trips",
  },
  allPointsCanSeeTrip: {
    bn: "তৈরি করা ট্রিপ সকল বুকিং পয়েন্ট দেখতে পারবে",
    en: "Created trips are visible to all booking points",
  },
  forgotCredentials: { bn: "আইডি বা পাসওয়ার্ড ভুলে গেছেন?", en: "Forgot ID or password?" },
  recoverAccess: { bn: "একাউন্ট রিকোভারি", en: "Account Recovery" },
  recoverMasterHelp: {
    bn: "ইমেইল দিন, পাসওয়ার্ড রিসেট লিংক পাঠানো হবে।",
    en: "Enter your email and we will send a password reset link.",
  },
  recoverStaffHelp: {
    bn: "আপনার তথ্য দিন, মাস্টার এডমিন আইডি/পিন রিসেট করে দেবেন।",
    en: "Send your details; a master admin will reset your ID/PIN.",
  },
  sendResetLink: { bn: "রিসেট লিংক পাঠান", en: "Send reset link" },
  sendRequest: { bn: "অনুরোধ পাঠান", en: "Send request" },
  resetLinkSent: { bn: "রিসেট লিংক ইমেইলে পাঠানো হয়েছে", en: "Reset link sent to your email" },
  requestSent: { bn: "অনুরোধ পাঠানো হয়েছে", en: "Request sent" },
  message: { bn: "বার্তা", en: "Message" },
  newPassword: { bn: "নতুন পাসওয়ার্ড", en: "New password" },
  updatePassword: { bn: "পাসওয়ার্ড আপডেট করুন", en: "Update password" },
  passwordUpdated: { bn: "পাসওয়ার্ড আপডেট হয়েছে", en: "Password updated" },
  recoveryRequests: { bn: "রিকোভারি অনুরোধ", en: "Recovery Requests" },
  newPin: { bn: "নতুন পিন", en: "New PIN" },
  resetPin: { bn: "পিন রিসেট", en: "Reset PIN" },
  pinReset: { bn: "পিন রিসেট হয়েছে", en: "PIN has been reset" },
  markHandled: { bn: "সম্পন্ন", en: "Mark handled" },
  open: { bn: "চলমান", en: "Open" },
  handled: { bn: "সম্পন্ন", en: "Handled" },
  bookingsList: { bn: "বুকিং তালিকা", en: "Bookings" },
  reports: { bn: "রিপোর্ট", en: "Reports" },
  search: { bn: "খুঁজুন", en: "Search" },
  searchBookingsHint: {
    bn: "টিকিট নম্বর, যাত্রীর নাম, ফোন বা সিট দিয়ে খুঁজুন",
    en: "Search by ticket no, passenger, phone or seat",
  },
  ticketNo: { bn: "টিকিট নম্বর", en: "Ticket No" },
  passengerName: { bn: "যাত্রীর নাম", en: "Passenger Name" },
  passengerPhone: { bn: "যাত্রীর ফোন", en: "Passenger Phone" },
  cancelSeats: { bn: "সিট বাতিল করুন", en: "Cancel seats" },
  cancelled2: { bn: "বাতিল হয়েছে", en: "Cancelled" },
  auditTrail: { bn: "অডিট ট্রেইল", en: "Audit Trail" },
  action: { bn: "কার্যক্রম", en: "Action" },
  when: { bn: "সময়", en: "When" },
  from: { bn: "শুরুর তারিখ", en: "From date" },
  to: { bn: "শেষ তারিখ", en: "To date" },
  exportPdf: { bn: "পিডিএফ ডাউনলোড", en: "Export PDF" },
  print: { bn: "প্রিন্ট", en: "Print" },
  dailySales: { bn: "দৈনিক বিক্রয়", en: "Daily Sales" },
  occupancy: { bn: "সিট পূর্ণতা", en: "Occupancy" },
  tickets: { bn: "টিকিট", en: "Tickets" },
  sales: { bn: "বিক্রয়", en: "Sales" },
  grandTotal: { bn: "সর্বমোট", en: "Grand Total" },
  fillRate: { bn: "পূর্ণতার হার", en: "Fill rate" },
  bookingsOverview: { bn: "বুকিং সারসংক্ষেপ", en: "Bookings Overview" },
  totalBookings: { bn: "মোট বুকিং", en: "Total bookings" },
  schedule: { bn: "শিডিউল", en: "Schedule" },
  totalSeats: { bn: "মোট সিট", en: "Total seats" },
  farePerSeat: { bn: "প্রতি সিট ভাড়া", en: "Fare per seat" },
  totalFare: { bn: "মোট ভাড়া", en: "Total fare" },
  ticketReceipt: { bn: "টিকিট / রশিদ", en: "Ticket / Receipt" },
  bookingConfirmed: { bn: "বুকিং কনফার্ম হয়েছে", en: "Booking confirmed" },
  close: { bn: "বন্ধ করুন", en: "Close" },
  accessDenied: { bn: "এই পেজে আপনার প্রবেশাধিকার নেই", en: "You do not have access to this page" },
  allPoints: { bn: "সব পয়েন্ট", en: "All points" },
  bookedBy: { bn: "বুক করেছে", en: "Booked by" },
  otherPoint: { bn: "অন্য পয়েন্ট", en: "Other point" },
  manualEntry: { bn: "ম্যানুয়াল এন্ট্রি", en: "Manual entry" },
  fromSchedule: { bn: "শিডিউল বোর্ড থেকে ট্রিপ তৈরি", en: "Create trip from schedule" },
  scheduleTripExists: { bn: "সতর্কতা: এই শিডিউল থেকে ইতিমধ্যে ট্রিপ তৈরি হয়েছে — ডুপ্লিকেট ট্রিপ তৈরি করা যাবে না", en: "Warning: a trip already exists for this schedule — duplicate not allowed" },
  tripCreated: { bn: "ট্রিপ তৈরি হয়েছে", en: "Trip created" },
  scheduleLoaded: { bn: "শিডিউল থেকে তথ্য বসানো হয়েছে — প্রয়োজনে এডিট করুন", en: "Filled from schedule — edit if needed" },
  noScheduleFound: { bn: "এই তারিখে এই গাড়ির শিডিউল নেই", en: "No schedule for this vehicle on this date" },
  secretCode: { bn: "গোপন কোড", en: "Secret code" },
  recoverCodeHelp: {
    bn: "আইডি/ইমেইল ও গোপন কোড দিন, তারপর নতুন পাসওয়ার্ড/পিন সেট করুন।",
    en: "Enter your ID/email and the secret code, then set a new password/PIN.",
  },
  recoverNow: { bn: "রিকোভার করুন", en: "Recover now" },
  invalidRecoveryCode: { bn: "গোপন কোড সঠিক নয়", en: "Invalid secret code" },
  accountNotFound: { bn: "একাউন্ট খুঁজে পাওয়া যায়নি", en: "Account not found" },
  changeSecretCode: { bn: "গোপন কোড পরিবর্তন", en: "Change secret code" },
  codeUpdated: { bn: "গোপন কোড আপডেট হয়েছে", en: "Secret code updated" },
  live: { bn: "লাইভ", en: "Live" },
  cancelBooking: { bn: "বুকিং বাতিল", en: "Cancel booking" },
  seatsReleased: { bn: "সিট আবার খালি করা হয়েছে", en: "Seats released" },
  tripFull: { bn: "এই ট্রিপে আর সিট খালি নেই", en: "No seats left on this trip" },
  invalidSeat: { bn: "সিট নির্বাচন সঠিক নয়", en: "Invalid seat selection" },

} as const;


export type TKey = keyof typeof dict;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "bn",
  setLang: () => {},
  t: (k) => dict[k].bn,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    const stored = window.localStorage.getItem("lang");
    if (stored === "bn" || stored === "en") setLangState(stored);
  }, []);





  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("lang", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((k: TKey) => dict[k][lang], [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useI18n() {
  return useContext(LangContext);
}

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}
