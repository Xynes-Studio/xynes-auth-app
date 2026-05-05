declare module "@lumia-ui/components" {
  type InputLikeEvent = React.ChangeEvent<HTMLInputElement>;
  type FocusLikeEvent = React.FocusEvent<HTMLInputElement>;
  type LumiaComponent = (
    props: Record<string, unknown>,
  ) => JSX.Element | null;
  type LumiaButtonProps = Record<string, unknown> & {
    children?: unknown;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    isLoading?: boolean;
    loadingText?: string;
  };
  type LumiaInputProps = Record<string, unknown> & {
    value?: string;
    defaultValue?: string;
    onChange?: (event: InputLikeEvent) => void;
    onBlur?: (event: FocusLikeEvent) => void;
    onFocus?: (event: FocusLikeEvent) => void;
  };
  type SelectLikeEvent = React.ChangeEvent<HTMLSelectElement>;
  type LumiaSelectProps = Record<string, unknown> & {
    value?: string;
    onChange?: (event: SelectLikeEvent) => void;
  };
  type LumiaCheckboxProps = Record<string, unknown> & {
    checked?: boolean;
    onChange?: (event: InputLikeEvent) => void;
  };
  export type ViewMode = "grid" | "list";
  type LumiaViewToggleProps = Record<string, unknown> & {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
  };
  type LumiaTileProps = Record<string, unknown> & {
    onSelectedChange?: (checked: boolean) => void;
    onActivate?: () => void;
  };

  export const Alert: LumiaComponent;
  export const Avatar: LumiaComponent;
  export const Button: (props: LumiaButtonProps) => JSX.Element | null;
  export const Card: LumiaComponent;
  export const CardContent: LumiaComponent;
  export const CardDescription: LumiaComponent;
  export const CardFooter: LumiaComponent;
  export const CardHeader: LumiaComponent;
  export const CardTitle: LumiaComponent;
  export const Flex: LumiaComponent;
  export const Badge: LumiaComponent;
  export const Checkbox: (props: LumiaCheckboxProps) => JSX.Element | null;
  export const ConfirmDialog: LumiaComponent;
  export const AppTile: (props: LumiaTileProps) => JSX.Element | null;
  export const EntityTile: (props: LumiaTileProps) => JSX.Element | null;
  export const UserTile: (props: LumiaTileProps) => JSX.Element | null;
  export const Input: (props: LumiaInputProps) => JSX.Element | null;
  export const InputGroup: LumiaComponent;
  export const InputGroupInput: (props: LumiaInputProps) => JSX.Element | null;
  export const InputGroupPrefix: LumiaComponent;
  export const InlineAlert: LumiaComponent;
  export const Menu: LumiaComponent;
  export const MenuContent: LumiaComponent;
  export const MenuItem: LumiaComponent;
  export const MenuLabel: LumiaComponent;
  export const MenuSeparator: LumiaComponent;
  export const MenuTrigger: LumiaComponent;
  export const NoResults: LumiaComponent;
  export const Select: (props: LumiaSelectProps) => JSX.Element | null;
  export const Skeleton: LumiaComponent;
  export const Spinner: LumiaComponent;
  export const StatusPill: LumiaComponent;
  export const Tabs: LumiaComponent;
  export const TabsList: LumiaComponent;
  export const TabsTrigger: LumiaComponent;
  export const Ticker: LumiaComponent;
  export const ViewToggle: (
    props: LumiaViewToggleProps,
  ) => JSX.Element | null;
  export function useConfirmDialog(): {
    open: boolean;
    openDialog: () => void;
    closeDialog: () => void;
    setOpen: (open: boolean) => void;
    dialogProps: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };
  };
}
