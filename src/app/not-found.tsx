import Link from "next/link";
export default function NotFound() {
  return <div className="p-10 text-center text-slate-400">Not found. <Link href="/" className="text-accent underline">Back to dashboard</Link></div>;
}
