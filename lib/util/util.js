exports.addRetryCountInterceptorToAxios = (ax) => {
    ax.interceptors.response.use(undefined, (err) => { //  Retry count interceptor for axios
        const { config } = err;
        if (!config || !config.retry || !config.delay) {return Promise.reject(err);}
        config.currentRetryCount = config.currentRetryCount || 0;
        if (config.currentRetryCount >= config.retry) {
            return Promise.reject(err);
        }
        config.currentRetryCount += 1;
        return new Promise(resolve => setTimeout(() => resolve(ax(config)), config.delay));
    });
};
