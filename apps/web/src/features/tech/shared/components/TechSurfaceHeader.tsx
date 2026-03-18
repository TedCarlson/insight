type Props = {
  title: string;
  fullName: string | null;
  techId: string | null;
  affiliation: string | null;
};

export default function TechSurfaceHeader(props: Props) {
  return (
    <div className="space-y-1">
      <div className="text-base font-semibold">{props.title}</div>

      {props.fullName ? (
        <div className="text-sm font-medium text-muted-foreground">
          {props.fullName}
        </div>
      ) : null}

      {(props.techId || props.affiliation) ? (
        <div className="text-xs text-muted-foreground">
          {props.techId ? `Tech ID: ${props.techId}` : ""}
          {props.techId && props.affiliation ? " • " : ""}
          {props.affiliation ?? ""}
        </div>
      ) : null}
    </div>
  );
}
