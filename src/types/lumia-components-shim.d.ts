declare module "@lumia-ui/components" {
  type InputLikeEvent = {
    target: { value: string };
    currentTarget: HTMLInputElement;
  };
  type FocusLikeEvent = {
    currentTarget: HTMLInputElement;
  };
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
    onBlur?: (event: InputLikeEvent) => void;
    onFocus?: (event: FocusLikeEvent) => void;
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
  export const Input: (props: LumiaInputProps) => JSX.Element | null;
  export const InputGroup: LumiaComponent;
  export const InputGroupInput: LumiaComponent;
  export const InputGroupPrefix: LumiaComponent;
  export const Menu: LumiaComponent;
  export const MenuContent: LumiaComponent;
  export const MenuItem: LumiaComponent;
  export const MenuLabel: LumiaComponent;
  export const MenuSeparator: LumiaComponent;
  export const MenuTrigger: LumiaComponent;
  export const Skeleton: LumiaComponent;
  export const Spinner: LumiaComponent;
  export const Ticker: LumiaComponent;
}
