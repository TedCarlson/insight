export default function BandChip(props: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
      {props.label}
    </div>
  );
}