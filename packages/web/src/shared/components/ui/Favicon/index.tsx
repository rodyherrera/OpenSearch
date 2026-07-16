import { useState } from 'react';

interface FaviconProps{
    url: string;
    className?: string;
}

const hostOf = (url: string): string => {
    try{
        return new URL(url.includes('://') ? url : `https://${url}`).host;
    }catch{
        return url;
    }
};

const Favicon = ({ url, className = 'size-9' }: FaviconProps) => {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    return (
        <span className={`relative grid shrink-0 place-items-center rounded-lg border border-hairline bg-surface-secondary ${className}`}>
            {!loaded ? <span className='size-2.5 rotate-45 rounded-[2px] bg-accent' aria-hidden='true' /> : null}
            {!failed ? (
                <img
                    src={`https://icons.duckduckgo.com/ip3/${hostOf(url)}.ico`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    alt=''
                    loading='lazy'
                    className={`absolute size-4 ${loaded ? '' : 'opacity-0'}`}
                />
            ) : null}
        </span>
    );
};

export default Favicon;
