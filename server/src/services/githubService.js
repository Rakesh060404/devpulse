import axios from "axios";

export const fetchUserRepos = async (accessToken) => {
    try {
        const response = await axios.get(
            "https://api.github.com/user/repos",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(error);

        throw new Error("Failed to fetch repositories");
    }
};

export const fetchRepoCommits = async (accessToken, owner, repo, since = null, page = 1, perPage = 100) => {
    try {
        const params = { per_page: perPage, page };
        if (since) params.since = since;

        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params,
            }
        );

        return response.data;
    } catch (error) {
        console.error(error);

        throw new Error("Failed to fetch commits");
    }
};

export const fetchRepoPRs = async (accessToken, owner, repo, state = 'all', page = 1, perPage = 100) => {
    try {
        const params = { per_page: perPage, page, state };

        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/pulls`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params,
            }
        );

        return response.data;
    } catch (error) {
        console.error(error);

        throw new Error("Failed to fetch pull requests");
    }
};

export const fetchRepoMetadata = async (accessToken, owner, repo) => {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(error);

        throw new Error("Failed to fetch repository metadata");
    }
};