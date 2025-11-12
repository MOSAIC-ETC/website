export function MosaicLogo({ fill, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 271 180" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M89.3013 0L132.603 25V75L89.3013 100L46 75V25L89.3013 0Z" fill={fill} />
      <path d="M181.301 0L224.603 25V75L181.301 100L138 75V25L181.301 0Z" fill={fill} />
      <path d="M227.301 80L270.603 105V155L227.301 180L184 155V105L227.301 80Z" fill={fill} />
      <path d="M43.3013 80L86.6025 105V155L43.3013 180L0 155V105L43.3013 80Z" fill={fill} />
      <path d="M135.301 80L178.603 105V155L135.301 180L92 155V105L135.301 80Z" fill={fill} />
    </svg>
  );
}
