import { Message } from "discord.js";
import axios from "axios";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { createPineconeClient, updatePineconeIndex } from "../services/pinecone";

/**
 * Transforms a GitHub URL into a GitHub API URL and the path in the repository.
 * @param githubUrl the url of the github repository
 * @returns the url of the github api and the path of the file that will be used to upload in pinecone
 */
function transformGitHubUrlToApiUrl(githubUrl: string): { apiUrl: string, startingPath: string } {
    const githubUrlRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/(main|master)\/(.+)$/;
    const match = githubUrl.match(githubUrlRegex);

    if (!match) {
        console.error("Invalid GitHub URL");
        throw new Error("Invalid GitHub URL");
    }

    const [, owner, repo, , path] = match; // Note the extra comma to skip the third capture group (main|master)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

    return { apiUrl, startingPath: path };
}

/**
 * Checks if the file is a txt,md,mdx file.
 * @param fileName the name of the file that will be used to upload in pinecone
 * @returns true if the file is a txt,md,mdx file. False otherwise.
 */
function isTextOrCodeFile(fileName: string): boolean {
    const allowedExtensions = ['md', 'txt','mdx'];
    const parts = fileName.split('.');
    const extension = parts[parts.length - 1].toLowerCase(); // Convert to lower case to ensure case-insensitive comparison
    return allowedExtensions.includes(extension);
}

/**
 * Retrieves the contents of the github repository.
 * Uploads the contents of the github repository in pinecone.
 * @param baseUrl the url of the github api
 * @param currentPath the path in the github repository
 */
async function retrieveContents(baseUrl: string, currentPath: string): Promise<void> {
    const url = `${baseUrl}${currentPath}`;
    const client = axios.create({
        headers: {
            'Authorization': 'token '+process.env.GITHUB_TOKEN || '',
            'User-Agent': 'request'
        }
    });
    console.log(`Retrieving contents for path: ${url}`);
    try {
        const resp = await client.get(url, { headers: { 'User-Agent': 'request' } });
        console.log(`status: ${resp.status}`);

        if (resp.status === 200) {
            const files = resp.data;

            if (Array.isArray(files)) {
                for (const file of files) {
                    const fileName = file.name || '';
                    const filePath = file.path || '';
                    const fileType = file.type || '';

                    if (fileType === 'dir') {
                        await retrieveContents( baseUrl, filePath);
                    } else if (fileType === 'file' && isTextOrCodeFile(fileName)) {
                        const downloadUrl = file.download_url || '';
                        console.log(`Downloading file: ${downloadUrl}`);
                        const fileContentResp = await client.get(downloadUrl, { responseType: 'blob' }); // Get the content as a Blob
                        const fileContent = fileContentResp.data;
            
                        // Create a Blob from the file content
                        const blob = new Blob([fileContent], { type: 'text/plain' }); // Adjust the MIME type if necessary
            
                        // Use TextLoader with the Blob
                        const textLoader = new TextLoader(blob);
                        const documents = await textLoader.load();
                        console.log('documents', documents);
                        const pineconeClient = await createPineconeClient({apiKey : process.env.PINECONE_API_KEY || '', environment : process.env.PINECONE_ENVIRONMENT || ''});        
                        await updatePineconeIndex(pineconeClient, process.env.OPENAI_API_KEY || '', process.env.PINECONE_INDEX || '', documents);   
                    }
                }
            }
        } else {
            console.log(`Failed to retrieve contents for path: ${currentPath}`);
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error making request:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
        } else {
            console.error('Non-Axios error:', error);
        }
    }
}

/**
 * Handles the upload command for Pinecone.
 * Retrieves the contents of the github repository.
 * Uploads the contents of the github repository in pinecone.
 * @param message - The Discord message that triggered the command.
 * @param url - The url of the github repository.
 * @async
 **/
export const handleUploadCommand = async (
    message: Message,
    url: string,
    ) => { 
      try {
        console.log("url: ", url);
        const { apiUrl, startingPath } = transformGitHubUrlToApiUrl(url);
        console.log("apiUrl: ", apiUrl);
        console.log("startingPath: ", startingPath);
        await retrieveContents(apiUrl, startingPath);
        message.channel.send("Upload successfully");
      } catch (error) {
      console.error("Error:", error);
      // Send an error message to the Discord channel if an error occurs
      message.channel.send("An error occurred while processing your request.");
    }
  }
  