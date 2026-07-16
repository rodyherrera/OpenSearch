import { ScrollShadow } from '@heroui/react';

interface LinkListProps{
    links: string[];
}

const LinkList = ({ links }: LinkListProps) => (
    <ScrollShadow className='max-h-96'>
        <ol className='py-3 font-mono text-xs leading-6'>
            {links.map((link, index) => (
                <li key={`${index}-${link}`} className='flex gap-4 px-4'>
                    <span className='w-8 shrink-0 text-right text-muted/50 select-none'>{index + 1}</span>
                    <a
                        href={link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='truncate text-foreground/90 hover:text-accent'
                    >
                        {link}
                    </a>
                </li>
            ))}
        </ol>
    </ScrollShadow>
);

export default LinkList;
