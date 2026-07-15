import DomainGraph from '@/modules/graph/components/DomainGraph';

const Graph = () => {
    return (
        <div className='flex flex-col gap-4'>
            <div>
                <h1 className='text-lg font-medium'>Live crawl graph</h1>
                <p className='text-sm text-muted'>
                    Domains the crawler discovers, linked in real time as pages stream in.
                </p>
            </div>

            <DomainGraph />
        </div>
    );
};

export default Graph;
