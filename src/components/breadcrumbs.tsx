import Link from "next/link";

export default function Breadcrumbs({ current }: { current: string }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>;
}
