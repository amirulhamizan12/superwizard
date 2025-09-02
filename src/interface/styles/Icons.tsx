import React from "react";

//===========================================================================================
// TYPES AND INTERFACES
//===========================================================================================

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  boxSize?: string;
  color?: string;
  w?: string | number;
  h?: string | number;
  flexShrink?: number;
  transition?: string;
  transform?: string;
}

export const Icon: React.FC<IconProps> = ({
  children,
  boxSize = "1em",
  color = "currentColor",
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = "2",
  strokeLinecap = "round",
  strokeLinejoin = "round",
  w,
  h,
  flexShrink,
  transition,
  transform,
  ...props
}) => {
  // Handle sizing - prioritize w/h over boxSize
  const width = w || boxSize;
  const height = h || boxSize;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      style={{
        color,
        flexShrink,
        transition,
        transform,
      }}
      {...props}
    >
      {children}
    </svg>
  );
};

//===========================================================================================
// GENERIC COMPONENTS
//===========================================================================================

// Generic SVG Icon component (moved from Bottom.tsx and Sidebar.tsx)
export const SvgIcon = ({
  path,
  size = 24,
  filled = false,
}: {
  path: string;
  size?: number;
  filled?: boolean;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d={path} />
  </svg>
);

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

export const PinIcon: React.FC<IconProps & { filled?: boolean }> = ({
  filled = false,
  ...props
}) => (
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
// LOGO / PROVIDER ICONS
//===========================================================================================

// OpenAI Icon
export const OpenAIIcon: React.FC<IconProps> = (props) => (
  <Icon viewBox="0 0 790 800" {...props}>
    <path
      fill="black"
      d="M737.295 327.369C746.24 300.432 749.334 271.896 746.369 243.667C743.405 215.438 734.451 188.167 720.105 163.676C698.837 126.657 666.363 97.3477 627.364 79.9744C588.366 62.6012 544.857 58.0612 503.112 67.0092C479.395 40.6279 449.155 20.9516 415.427 9.95625C381.7 -1.03906 345.673 -2.96617 310.965 4.36847C276.257 11.7031 244.089 28.0412 217.694 51.742C191.299 75.4427 171.604 105.672 160.589 139.393C132.777 145.095 106.504 156.669 83.5237 173.339C60.5436 190.009 41.3862 211.392 27.3319 236.059C5.83308 273.017 -3.35539 315.854 1.09494 358.377C5.54527 400.901 23.4038 440.907 52.0886 472.612C43.1107 499.537 39.986 528.068 42.9236 556.297C45.8611 584.527 54.793 611.803 69.1219 636.302C90.4166 673.335 122.919 702.651 161.946 720.024C200.972 737.397 244.507 741.931 286.275 732.972C305.117 754.191 328.269 771.145 354.186 782.704C380.102 794.262 408.186 800.159 436.562 799.999C479.35 800.039 521.043 786.48 555.624 761.282C590.205 736.084 615.884 700.548 628.955 659.806C656.763 654.093 683.033 642.515 706.012 625.846C728.99 609.176 748.15 587.797 762.212 563.136C783.457 526.233 792.487 483.556 788.012 441.211C783.536 398.865 765.785 359.016 737.295 327.369ZM436.562 747.639C401.519 747.695 367.575 735.412 340.682 712.946L345.412 710.266L504.689 618.326C508.653 616.001 511.944 612.685 514.239 608.703C516.534 604.722 517.754 600.211 517.779 595.616V371.053L585.112 410.006C585.445 410.174 585.733 410.419 585.953 410.721C586.173 411.022 586.319 411.371 586.379 411.739V597.826C586.294 637.533 570.483 675.59 542.405 703.668C514.327 731.745 476.269 747.555 436.562 747.639ZM114.539 610.126C96.9643 579.78 90.6543 544.208 96.7186 509.669L101.452 512.509L260.885 604.449C264.83 606.764 269.321 607.984 273.895 607.984C278.469 607.984 282.96 606.764 286.905 604.449L481.665 492.166V569.913C481.647 570.315 481.538 570.709 481.346 571.064C481.155 571.419 480.885 571.726 480.559 571.962L319.232 665.006C284.803 684.839 243.91 690.2 205.532 679.911C167.154 669.621 134.428 644.523 114.539 610.126ZM72.5919 263.186C90.288 232.645 118.22 209.35 151.442 197.426V386.666C151.382 391.238 152.55 395.742 154.824 399.708C157.099 403.675 160.396 406.958 164.372 409.216L358.185 521.026L290.849 559.976C290.484 560.169 290.078 560.27 289.665 560.27C289.253 560.27 288.846 560.169 288.482 559.976L127.472 467.092C93.1073 447.173 68.0369 414.447 57.7508 376.082C47.4647 337.716 52.8013 296.838 72.5919 262.399V263.186ZM625.802 391.712L431.359 278.799L498.539 239.999C498.903 239.806 499.309 239.705 499.722 239.705C500.135 239.705 500.541 239.806 500.905 239.999L661.915 333.042C686.534 347.248 706.603 368.163 719.781 393.346C732.958 418.529 738.7 446.942 736.335 475.266C733.971 503.59 723.598 530.657 706.428 553.307C689.257 575.957 665.998 593.256 639.365 603.183V413.942C639.226 409.378 637.902 404.929 635.523 401.031C633.145 397.133 629.797 393.924 625.802 391.712ZM692.825 290.942L688.092 288.102L528.975 195.376C525.006 193.047 520.487 191.819 515.885 191.819C511.283 191.819 506.764 193.047 502.795 195.376L308.199 307.656V229.913C308.157 229.517 308.223 229.118 308.39 228.757C308.556 228.396 308.817 228.087 309.145 227.863L470.155 134.976C494.832 120.76 523.047 113.864 551.499 115.094C579.952 116.325 607.466 125.632 630.823 141.925C654.181 158.219 672.416 180.826 683.396 207.104C694.377 233.381 697.648 262.241 692.829 290.309L692.825 290.942ZM271.449 428.766L204.115 389.972C203.778 389.77 203.49 389.495 203.271 389.169C203.052 388.842 202.908 388.471 202.849 388.082V202.473C202.886 173.998 211.028 146.123 226.324 122.106C241.619 98.0886 263.436 78.9221 289.223 66.8471C315.01 54.7722 343.702 50.2879 371.944 53.9185C400.186 57.5491 426.811 69.1446 448.705 87.3492L443.972 90.0325L284.699 181.966C280.734 184.291 277.443 187.607 275.148 191.589C272.853 195.57 271.633 200.08 271.609 204.676L271.449 428.766ZM308.035 349.919L394.769 299.926L481.665 349.919V449.899L395.085 499.889L308.195 449.899L308.035 349.919Z"
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

// Helper function to get provider icon by ID
export const getProviderIcon = (providerId: string) => {
  // Check for x-ai related providers (handles cases like "x-ai/grok-3", "x-ai", "xai", etc.)
  if (
    providerId.includes("x-ai") ||
    providerId === "xai" ||
    providerId === "grok"
  ) {
    return GrokIcon;
  }

  switch (providerId) {
    case "openai":
      return OpenAIIcon;
    case "google":
      return GoogleIcon;
    case "anthropic":
      return AnthropicIcon;
    case "openrouter":
      return OpenRouterIcon;
    case "meta":
      return MetaIcon;
    default:
      return null;
  }
};
