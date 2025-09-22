import React from "react";

//===========================================================================================
// TYPES AND INTERFACES
//===========================================================================================

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  color?: string;
  w?: string | number;
  h?: string | number;
}

export const Icon: React.FC<IconProps> = ({
  children,
  color = "currentColor",
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = "2",
  strokeLinecap = "round",
  strokeLinejoin = "round",
  w = "1em",
  h = "1em",
  ...props }) => 
  {
  return (
    <svg
      width={w}
      height={h}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      style={{ color }}
      {...props}
    >
      {children}
    </svg>
  );
};

//===========================================================================================
// ICONS PACK
//===========================================================================================

export const HomeIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M5 12l-2 0l9 -9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7 M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const SidebarIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M9 4l0 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const ToolsIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4 M14.5 5.5l4 4 M12 8l-5 -5l-4 4l5 5 M7 8l-1.5 1.5 M16 12l5 5l-4 4l-5 -5 M16 17l-1.5 1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const DevelopIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 5.5l4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8l-5 -5l-4 4l5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 8l-1.5 1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 12l5 5l-4 4l-5 -5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 17l-1.5 1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const SwatchIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2 M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9 M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12 M17 17l0 .01"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const PinIcon: React.FC<IconProps & { filled?: boolean }> = ({ filled = false, ...props}) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      d="M12 17v5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const LockIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const GithubIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 21l-6 -6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const UserCircleIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);


export const SettingsIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 9l6 6 6-6"
    />
  </Icon>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M18 6l-12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 6l12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M12 5l0 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12l14 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const ApiIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path d="m19 3 1 1" />
    <path d="m20 2-4.5 4.5" />
    <path d="M20 8v13a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H14" />
    <circle cx="14" cy="8" r="2" />
  </Icon>
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M5 12l14 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12l6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12l6 -6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const EditIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 5l3 3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const DeleteIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 7l16 0" />
    <path d="M10 11l0 6" />
    <path d="M14 11l0 6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
  </Icon>
);

export const ViewIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
  </Icon>
);

export const ViewOffIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M21 9c-2.4 2.667 -5.4 4 -9 4c-3.6 0 -6.6 -1.333 -9 -4" />
    <path d="M3 15l2.5 -3.8" />
    <path d="M21 14.976l-2.492 -3.776" />
    <path d="M9 17l.5 -4" />
    <path d="M15 17l-.5 -4" />
  </Icon>
);

export const MoonIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
  </Icon>
);

export const LinkIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5" />
    <path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5" />
  </Icon>
);

export const LogoutIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 8v-2a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-2" />
    <path d="M15 12h-12l3 -3" />
    <path d="M6 15l-3 -3" />
  </Icon>
);

export const LoginIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M14 8v-2a2 2 0 0 0 -2 -2H5a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
    <path d="M9 12h12l-3 3" />
    <path d="M18 9l3 3" />
  </Icon>
);

export const MenuIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" stroke="none" {...props}>
    <path
      fill="#1d7ba7"
      d="M4 6.5h16a1.5 1.5 0 0 1 0 3H4a1.5 1.5 0 0 1 0-3zm0 8h12a1.5 1.5 0 0 1 0 3H4a1.5 1.5 0 0 1 0-3z"
    />
  </Icon>
);

export const NewChatIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
      d="M12.007 19.98a9.869 9.869 0 0 1 -4.307 -.98l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.992 1.7 2.93 4.04 2.747 6.34"
      fill="none"
      stroke="#A0AEC0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 19h6"
      fill="none"
      stroke="#A0AEC0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 16v6"
      fill="none"
      stroke="#A0AEC0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

//===========================================================================================

export const ClickIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 256 256" {...props}>
    <path
      d="M88,24V16a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0ZM16,104h8a8,8,0,0,0,0-16H16a8,8,0,0,0,0,16ZM124.42,39.16a8,8,0,0,0,10.74-3.58l8-16a8,8,0,0,0-14.31-7.16l-8,16A8,8,0,0,0,124.42,39.16Zm-96,81.69-16,8a8,8,0,0,0,7.16,14.31l16-8a8,8,0,1,0-7.16-14.31ZM219.31,184a16,16,0,0,1,0,22.63l-12.68,12.68a16,16,0,0,1-22.63,0L132.7,168,115,214.09c0,.1-.08.21-.13.32a15.83,15.83,0,0,1-14.6,9.59l-.79,0a15.83,15.83,0,0,1-14.41-11L32.8,52.92A16,16,0,0,1,52.92,32.8L213,85.07a16,16,0,0,1,1.41,29.8l-.32.13L168,132.69ZM208,195.31,156.69,144h0a16,16,0,0,1,4.93-26l.32-.14,45.95-17.64L48,48l52.2,159.86,17.65-46c0-.11.08-.22.13-.33a16,16,0,0,1,11.69-9.34,16.72,16.72,0,0,1,3-.28,16,16,0,0,1,11.3,4.69L195.31,208Z"
      fill="currentColor"
    />
  </Icon>
);

export const SetValueIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
    <path
      d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 7v10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export const NavigationIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
    <path
      d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.6 9h16.8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.6 15h16.8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.5 3a17 17 0 0 0 0 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 3a17 17 0 0 1 0 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

//===========================================================================================
// LOGO / PROVIDER ICONS
//===========================================================================================

// OpenAI Icon
export const OpenAIIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 185 190" {...props}>
    <rect width="185" height="190" rx="92.5" fill="#FAFAFA" />
    <path
      d="M74.8734 73.2554V58.3122C74.8734 57.0536 75.3456 56.1093 76.4462 55.4808L106.491 38.1785C110.58 35.8192 115.457 34.7186 120.489 34.7186C139.365 34.7186 151.32 49.3475 151.32 64.9192C151.32 66.0199 151.32 67.2785 151.162 68.537L120.017 50.2903C118.13 49.1897 116.242 49.1897 114.354 50.2903L74.8734 73.2554ZM145.028 131.456V95.7485C145.028 93.5457 144.083 91.9729 142.196 90.8722L102.715 67.9071L115.613 60.5137C116.714 59.8852 117.658 59.8852 118.759 60.5137L148.803 77.8161C157.455 82.8502 163.274 93.5457 163.274 103.927C163.274 115.881 156.197 126.892 145.028 131.454V131.456ZM65.593 99.9962L52.6948 92.4465C51.5941 91.818 51.122 90.8737 51.122 89.6151V55.0103C51.122 38.18 64.0202 25.4381 81.4805 25.4381C88.0875 25.4381 94.2208 27.641 99.4129 31.573L68.4259 49.5054C66.5388 50.6061 65.5945 52.1789 65.5945 54.3818V99.9977L65.593 99.9962ZM93.3562 116.04L74.8733 105.659V83.6381L93.3562 73.257L111.837 83.6381V105.659L93.3562 116.04ZM105.232 163.859C98.6249 163.859 92.4916 161.656 87.2995 157.725L118.286 139.791C120.173 138.691 121.118 137.118 121.118 134.915V89.2993L134.174 96.8491C135.275 97.4776 135.747 98.4219 135.747 99.6805V134.286C135.747 151.115 122.69 163.858 105.232 163.858V163.859ZM67.9522 128.782L37.9079 111.48C29.2559 106.445 23.4369 95.75 23.4369 85.3689C23.4369 73.257 30.6725 62.4037 41.8399 57.8417V93.7051C41.8399 95.9079 42.7842 97.4807 44.6713 98.5814L83.9961 121.388L71.0979 128.782C69.9972 129.411 69.0528 129.411 67.9522 128.782ZM66.2229 154.579C48.4484 154.579 35.3923 141.208 35.3923 124.692C35.3923 123.433 35.5501 122.175 35.7066 120.916L66.6936 138.849C68.5807 139.949 70.4693 139.949 72.3564 138.849L111.838 116.042V130.985C111.838 132.244 111.365 133.187 110.265 133.816L80.2204 151.118C76.1306 153.477 71.2542 154.579 66.2215 154.579L66.2229 154.579ZM105.232 173.296C124.265 173.296 140.151 159.769 143.77 141.836C161.387 137.274 172.713 120.758 172.713 103.928C172.713 92.9172 167.994 82.2218 159.499 74.5141C160.286 71.2106 160.759 67.9071 160.759 64.6051C160.759 42.1122 142.512 25.2804 121.434 25.2804C117.188 25.2804 113.097 25.9089 109.008 27.3254C101.928 20.4041 92.1758 16 81.4805 16C62.4474 16 46.5614 29.5268 42.9421 47.4591C25.3255 52.021 14 68.5371 14 85.3673C14 96.3785 18.7184 107.074 27.2125 114.782C26.426 118.085 25.9539 121.388 25.9539 124.691C25.9539 147.183 44.2005 164.015 65.2787 164.015C69.5249 164.015 73.6149 163.387 77.7047 161.971C84.7823 168.892 94.535 173.296 105.232 173.296Z"
      fill="black"
    />
  </Icon>
);

// Google Icon
export const GoogleIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 256 262" {...props}>
    <path
      fill="#4285F4"
      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
    />
    <path
      fill="#34A853"
      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
    />
    <path
      fill="#FBBC05"
      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
    />
    <path
      fill="#EB4335"
      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
    />
  </Icon>
);

// Apple Icon
export const AppleIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 384 512" fill="currentColor" {...props}>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </Icon>
);

// Anthropic Icon
export const AnthropicIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 350 351" {...props}>
    <path
      fill="#D97757"
      d="M68.6709 233.349L137.519 194.635L138.671 191.261L137.519 189.396H134.152L122.633 188.686L83.2911 187.62L49.1772 186.2L16.1266 184.424L7.79747 182.648L0 172.348L0.797468 167.198L7.79747 162.492L17.8101 163.38L39.962 164.889L73.1899 167.198L97.2911 168.619L133 172.348H138.671L139.468 170.039L137.519 168.619L136.013 167.198L101.633 143.845L64.4177 119.161L44.9241 104.954L34.3797 97.7615L29.0633 91.0132L26.7595 76.2735L36.3291 65.7071L49.1772 66.595L52.4557 67.4829L65.481 77.5166L93.3038 99.0933L129.633 125.909L134.949 130.349L137.076 128.839L137.342 127.774L134.949 123.778L115.19 87.9942L94.1013 51.5889L84.7089 36.4941L82.2278 27.4371C81.3418 23.7078 80.7215 20.6001 80.7215 16.7819L91.6203 1.95345L97.6456 0L112.177 1.95345L118.291 7.28105L127.329 27.9699L141.949 60.557L164.633 104.865L171.278 118.006L174.823 130.171L176.152 133.9H178.456V131.769L180.316 106.818L183.772 76.1847L187.139 36.7604L188.291 25.6613L193.785 12.3423L204.684 5.15001L213.19 9.23451L220.19 19.2682L219.215 25.7501L215.051 52.832L206.899 95.2752L201.582 123.689H204.684L208.228 120.137L222.582 101.047L246.684 70.8571L257.316 58.87L269.722 45.6398L277.696 39.3354H292.76L303.835 55.851L298.873 72.8993L283.367 92.6114L270.519 109.305L252.089 134.167L240.57 154.056L241.633 155.655L244.38 155.388L286.025 146.509L308.532 142.425L335.38 137.807L347.519 143.49L348.848 149.262L344.063 161.071L315.354 168.175L281.684 174.923L231.532 186.821L230.911 187.265L231.62 188.153L254.215 190.284L263.873 190.817H287.532L331.57 194.102L343.089 201.738L350 211.062L348.848 218.165L331.127 227.222L307.203 221.539L251.38 208.22L232.241 203.426H229.582V205.024L245.532 220.651L274.772 247.112L311.367 281.208L313.228 289.644L308.532 296.303L303.57 295.593L271.405 271.352L259 260.431L230.911 236.723H229.051V239.209L235.519 248.71L269.722 300.21L271.494 316.015L269.013 321.165L260.152 324.273L250.405 322.497L230.38 294.35L209.734 262.651L193.076 234.237L191.038 235.391L181.203 341.499L176.595 346.916L165.962 351L157.101 344.252L152.405 333.33L157.101 311.753L162.772 283.606L167.38 261.23L171.544 233.438L174.025 224.203L173.848 223.582L171.81 223.848L150.899 252.617L119.089 295.682L93.9241 322.675L87.8987 325.072L77.443 319.656L78.4177 309.977L84.2658 301.365L119.089 256.968L140.089 229.442L153.646 213.548L153.557 211.239H152.759L60.2532 271.441L43.7722 273.572L36.6835 266.913L37.5696 255.991L40.9367 252.439L68.7595 233.26L68.6709 233.349Z"
    />
  </Icon>
);

// OpenRouter Icon
export const OpenRouterIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 512 512" {...props}>
    <g>
      <path
        d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
        stroke="#94A3B8"
        strokeWidth="90"
        fill="none"
      />
      <path
        d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"
        fill="#94A3B8"
      />
      <path
        d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
        stroke="#94A3B8"
        strokeWidth="90"
        fill="none"
      />
      <path
        d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"
        fill="#94A3B8"
      />
    </g>
  </Icon>
);

// Meta Icon
export const MetaIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 287.56 191" {...props}>
    <defs>
      <linearGradient
        id="meta-linear-gradient"
        x1="62.34"
        y1="101.45"
        x2="260.34"
        y2="91.45"
        gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#0064e1" />
        <stop offset="0.4" stopColor="#0064e1" />
        <stop offset="0.83" stopColor="#0073ee" />
        <stop offset="1" stopColor="#0082fb" />
      </linearGradient>
      <linearGradient
        id="meta-linear-gradient-2"
        x1="41.42"
        y1="53"
        x2="41.42"
        y2="126"
        gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#0082fb" />
        <stop offset="1" stopColor="#0064e0" />
      </linearGradient>
    </defs>
    <path
      fill="#0081fb"
      d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"
    />
    <path
      fill="url(#meta-linear-gradient)"
      d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"
    />
    <path
      fill="url(#meta-linear-gradient-2)"
      d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"
    />
  </Icon>
);

// Grok Icon
export const GrokIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"
    />
  </Icon>
);

// SuperWizard Icon
export const SuperWizardIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 500 500" {...props}>
    <rect x="8" y="8" width="484" height="484" rx="89" fill="#F9EED2" stroke="#A6A09B" strokeWidth="16"/>
    <path d="M248.546 407.271C232.447 407.271 218.984 405.734 208.151 402.667C197.317 399.583 189.119 398.042 183.567 398.042C178.885 398.042 175.224 398.849 172.588 400.458C169.947 402.073 167.677 403.677 165.776 405.292C163.869 406.901 161.307 407.708 158.088 407.708C154.281 407.708 150.843 406.094 147.776 402.875C144.703 399.656 142.432 393.365 140.963 384C138.921 371.698 137.239 360.203 135.921 349.521C134.599 338.844 133.651 328.521 133.067 318.562C132.776 311.844 133.432 306.578 135.046 302.771C136.656 298.969 139.656 297.062 144.046 297.062C148.432 297.062 151.869 298.599 154.359 301.667C156.843 304.74 160.432 309.932 165.13 317.25C169.515 324.573 175.442 332.771 182.901 341.854C190.369 350.927 199.963 358.682 211.671 365.125C223.38 371.557 237.427 374.771 253.817 374.771C267.578 374.771 277.385 371.188 283.234 364.021C289.093 356.844 292.171 349.01 292.463 340.521C292.463 331.453 289.015 323.333 282.13 316.167C275.255 308.99 266.401 302.25 255.567 295.958C244.734 289.667 233.317 283.448 221.317 277.292C204.635 268.516 189.994 260.25 177.401 252.5C164.817 244.74 154.942 235.516 147.776 224.833C140.609 214.141 137.026 200.307 137.026 183.333C137.026 166.057 141.994 150.542 151.942 136.792C161.901 123.031 175.442 112.125 192.567 104.083C209.692 96.0312 228.786 92 249.859 92C260.984 92 271.078 93.099 280.151 95.2917C289.234 97.4896 296.114 98.5833 300.796 98.5833C306.656 98.5833 310.828 97.4896 313.317 95.2917C315.802 93.099 319.385 92 324.067 92C328.161 92 331.677 93.4688 334.609 96.3958C337.536 99.3281 340.026 105.474 342.067 114.833C343.828 123.323 345.442 132.177 346.901 141.396C348.359 150.62 349.234 159.911 349.526 169.271C350.119 176.01 349.39 181.354 347.338 185.312C345.296 189.26 341.781 191.229 336.796 191.229C332.989 191.229 329.552 189.552 326.484 186.188C323.411 182.828 319.385 177.635 314.401 170.604C309.427 163.578 303.572 156.333 296.838 148.875C290.114 141.406 282.432 135.182 273.796 130.208C265.156 125.224 255.567 122.729 245.026 122.729C232.734 122.729 223.296 125.885 216.713 132.188C210.13 138.479 206.838 146.599 206.838 156.542C206.838 169.141 212.468 179.906 223.734 188.833C235.01 197.75 252.505 208.354 276.213 220.646C293.765 229.438 309.349 237.865 322.963 245.917C336.572 253.958 347.255 263.104 355.005 273.354C362.765 283.594 366.651 296.76 366.651 312.854C366.651 327.786 363.427 341.104 356.984 352.812C350.552 364.521 341.697 374.406 330.421 382.458C319.156 390.5 306.427 396.646 292.234 400.896C278.036 405.146 263.474 407.271 248.546 407.271Z" fill="#1D7BA7"/>
  </Icon>
);

// Helper function to get provider icon by ID
export const getProviderIcon = (providerId: string) => {
  const id = providerId?.toLowerCase().trim();

  // Check for x-ai related providers (handles cases like "x-ai/grok-3", "x-ai", "xai", etc.)
  if (id.includes("x-ai") || id === "xai" || id === "grok") {
    return GrokIcon;
  }

  // Map OpenRouter provider prefixes to canonical vendors
  // e.g. "meta-llama/llama-3.1" → Meta
  if (id === "meta" || id.startsWith("meta-llama")) {
    return MetaIcon;
  }

  switch (id) {
    case "openai":
      return OpenAIIcon;
    case "google":
      return GoogleIcon;
    case "anthropic":
      return AnthropicIcon;
    case "openrouter":
      return OpenRouterIcon;
    default:
      return null;
  }
};
