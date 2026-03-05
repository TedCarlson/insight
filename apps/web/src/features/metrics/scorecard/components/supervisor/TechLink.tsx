import Link from "next/link";

export default function TechLink(props: { person_id: string; children: React.ReactNode; className?: string }) {
  return (
    <Link className={props.className ?? ""} href={`/metrics/tech-scorecard/${props.person_id}`}>
      {props.children}
    </Link>
  );
}