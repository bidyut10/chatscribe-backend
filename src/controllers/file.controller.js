import { GoogleGenerativeAI } from '@google/generative-ai';
import { prompt } from '../prompt/gemini.prompt.js';
import { searchPrompt } from '../prompt/search.prompt.js';
import Files from '../models/file.model.js';
import config from '../config/config.js';
import { USER_STRINGS } from '../constants/strings.js';
import { logSuccess, logError, logWarning, logDebug } from '../utils/logger.utils.js';
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
  sanitizeInput
} from './base.controller.js';

// Initialize Gemini AI
let model = null;
let geminiInitialized = false;

try {
    if (!config.gemini.geminiKey) {
        logWarning("GEMINI_API_KEY environment variable is not set. PDF extraction will not be available.");
    } else if (!config.gemini.geminiModel) {
        logWarning("GEMINI_API_MODEL environment variable is not set. Using default model: 'gemini-1.5-pro-latest'.");
    } else {
        const genAI = new GoogleGenerativeAI(config.gemini.geminiKey);
        model = genAI.getGenerativeModel({
            model: config.gemini.geminiModel,
            // Add timeout and retry settings
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        });
        geminiInitialized = true;
        logSuccess("Gemini AI model initialized successfully", { model: config.gemini.geminiModel });
    }
} catch (error) {
    logError("Failed to initialize GoogleGenerativeAI", error);
    model = null;
    geminiInitialized = false;
}

/**
 * Extract PDF data using Gemini AI and store it in JSON format
 */
export const extractPdfData = async (req, res) => {
    let fileRecord = null;
    try {
        if (!req.file) {
            logError('PDF extraction failed', new Error('No file provided'), { 
                userId: req.user?.userId,
                requestId: req.requestId
            });
            return errorResponse(res, new Error(USER_STRINGS.FILE.UPLOAD_FAILED), 400, 'File Error');
        }

        const uploadedFile = req.file;
        const userId = req.user.userId;

        // Validate file type
        if (uploadedFile.mimetype !== 'application/pdf') {
            logError('PDF extraction failed', new Error('Invalid file type'), { 
                userId,
                requestId: req.requestId,
                mimeType: uploadedFile.mimetype
            });
            return errorResponse(res, new Error(USER_STRINGS.FILE.INVALID_FILE_TYPE), 400, 'File Error');
        }

        // Create file record with processing status
        fileRecord = new Files({
            user: userId,
            name: sanitizeInput(uploadedFile.originalname.replace(/\s+/g, '_').replace(/[^\w\.-]/g, '_')),
            originalName: uploadedFile.originalname,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size,
            status: 'processing',
            fileContent: uploadedFile.buffer.toString('base64') // Store the PDF content
        });

        await fileRecord.save();
        logSuccess('PDF processing started', { 
            fileId: fileRecord._id,
            userId,
            requestId: req.requestId,
            fileName: fileRecord.originalName
        });

        // Check if Gemini AI is initialized
        if (!geminiInitialized || !model) {
            fileRecord.status = 'failed';
            fileRecord.error = 'Gemini AI service is not available. Please check your API key configuration.';
            await fileRecord.save();
            
            logError('PDF extraction failed', new Error('Gemini AI service not available'), {
                fileId: fileRecord._id,
                userId,
                requestId: req.requestId
            });
            
            return errorResponse(res, new Error('Gemini AI service is not available. Please check your API key configuration.'), 503, 'Service Unavailable');
        }

        // Extract data using Gemini AI
        const base64Data = uploadedFile.buffer.toString('base64');
        const filePart = {
            inlineData: { data: base64Data, mimeType: uploadedFile.mimetype },
        };
        const promptParts = [filePart, prompt];

        logDebug('Sending request to Gemini AI', { 
            fileId: fileRecord._id,
            requestId: req.requestId
        });

        const result = await model.generateContent(promptParts);
        const response = await result.response;
        const extractedText = response.text();

        // Log the raw response for debugging
        logDebug('Raw response from Gemini AI', { 
            fileId: fileRecord._id,
            requestId: req.requestId,
            rawResponse: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '') // Log first 500 chars
        });

        // Parse the extracted data
        let extractedData;
        try {
            // Try to clean the response if it's not valid JSON
            let cleanedText = extractedText;
            
            // Check if the response starts with a backtick (code block)
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.substring(7);
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.substring(3);
            }
            
            // Check if the response ends with a backtick
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3);
            }
            
            // Trim whitespace
            cleanedText = cleanedText.trim();
            
            // Try to parse the cleaned text
            extractedData = JSON.parse(cleanedText);
            logDebug('Successfully parsed extracted data', { 
                fileId: fileRecord._id,
                requestId: req.requestId
            });
        } catch (error) {
            logError('Failed to parse extracted data as JSON', error, { 
                fileId: fileRecord._id,
                requestId: req.requestId,
                rawResponse: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
            });
            
            // Create a fallback structure if parsing fails
            extractedData = {
                pdf_title: fileRecord.originalName,
                pages: [
                    {
                        page_number: 1,
                        content: [
                            {
                                type: "text",
                                text: "Failed to extract structured data from PDF. Raw text extraction failed."
                            }
                        ]
                    }
                ]
            };
            
            // Update file record with error information
            fileRecord.status = 'completed';
            fileRecord.error = 'Failed to parse extracted data as JSON. Using fallback structure.';
        }

        // Update file record with extracted data
        fileRecord.extractedData = extractedData;
        fileRecord.searchableContent = JSON.stringify(extractedData);
        fileRecord.status = 'completed';
        await fileRecord.save();

        logSuccess('PDF processing completed', { 
            fileId: fileRecord._id,
            userId,
            requestId: req.requestId,
            fileName: fileRecord.originalName
        });

        return successResponse(res, {
            fileId: fileRecord._id,
            name: fileRecord.name,
            extractedData: extractedData
        }, 200, USER_STRINGS.FILE.EXTRACTION_SUCCESS);
    } catch (error) {
        logError('PDF extraction failed', error, { 
            userId: req.user?._id,
            requestId: req.requestId,
            fileId: fileRecord?._id
        });
        
        // Update file record if it exists
        if (fileRecord) {
            fileRecord.status = 'failed';
            fileRecord.error = error.message;
            await fileRecord.save();
        }
        
        return errorResponse(res, error);
    }
};

/**
 * Search through extracted PDF data
 */
export const searchPdfData = async (req, res) => {
    try {
        const { query, fileId } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        try {
            validateRequiredFields(req.body, ['query']);
        } catch (validationError) {
            logError('PDF search validation failed', validationError, { 
                userId,
                requestId: req.requestId
            });
            return errorResponse(res, validationError, 400, 'Validation Error');
        }

        let searchQuery = { user: userId };
        if (fileId) {
            searchQuery._id = fileId;
        }

        logDebug('Searching PDF data', { 
            userId,
            requestId: req.requestId,
            query,
            fileId: fileId || 'all'
        });

        const files = await Files.find(searchQuery);
        if (!files.length) {
            logWarning('No files found for search', { 
                userId,
                requestId: req.requestId,
                query
            });
            return errorResponse(res, new Error(USER_STRINGS.FILE.NO_FILES_FOUND), 404, 'Not Found');
        }

        // Check if Gemini AI is initialized
        if (!geminiInitialized || !model) {
            logError('PDF search failed', new Error('Gemini AI service not available'), {
                userId,
                requestId: req.requestId
            });
            return errorResponse(res, new Error('Gemini AI service is not available. Please check your API key configuration.'), 503, 'Service Unavailable');
        }

        // Prepare the search results
        const searchResults = [];
        
        // Process each file
        for (const file of files) {
            if (!file.extractedData) {
                logWarning('File has no extracted data', {
                    fileId: file._id,
                    userId,
                    requestId: req.requestId
                });
                continue;
            }

            try {
                // Create a prompt for Gemini AI to search through the extracted data
                const searchDataPrompt = `${searchPrompt}\n\nQuery: "${query}"\n\nJSON Data: ${JSON.stringify(file.extractedData)}`;
                
                // Remove console.log to prevent potential issues with large prompts
                // console.log(searchDataPrompt);
                
                // Set a timeout for the Gemini AI request
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Gemini AI request timed out')), 30000); // 30 second timeout
                });
                
                // Generate content using Gemini AI with timeout
                const resultPromise = model.generateContent(searchDataPrompt);
                const result = await Promise.race([resultPromise, timeoutPromise]);
                const response = await result.response;
                const rawAnswer = response.text().trim();
                
                // Parse the answer based on its format
                let parsedAnswer;
                try {
                    // Check if the answer is an array
                    if (rawAnswer.startsWith('[') && rawAnswer.endsWith(']')) {
                        parsedAnswer = JSON.parse(rawAnswer);
                    } 
                    // Check if the answer is an object
                    else if (rawAnswer.startsWith('{') && rawAnswer.endsWith('}')) {
                        parsedAnswer = JSON.parse(rawAnswer);
                    } 
                    // Otherwise, treat it as a string
                    else {
                        parsedAnswer = rawAnswer;
                    }
                } catch (parseError) {
                    // If parsing fails, use the raw answer as is
                    logWarning('Failed to parse answer from Gemini AI', parseError, {
                        fileId: file._id,
                        userId,
                        requestId: req.requestId,
                        rawAnswer: rawAnswer.substring(0, 100) + (rawAnswer.length > 100 ? '...' : '')
                    });
                    parsedAnswer = rawAnswer;
                }
                
                // Add the result to the search results
                searchResults.push({
                    fileId: file._id,
                    fileName: file.originalName,
                    answer: parsedAnswer
                });
                
                logDebug('Search completed for file', {
                    fileId: file._id,
                    userId,
                    requestId: req.requestId,
                    query
                });
            } catch (error) {
                logError('Error searching file', error, {
                    fileId: file._id,
                    userId,
                    requestId: req.requestId
                });
                // Continue with other files even if one fails
            }
        }

        logSuccess('PDF search completed', {
            userId,
            requestId: req.requestId,
            query,
            resultCount: searchResults.length
        });

        return successResponse(res, {
            query,
            results: searchResults
        });
    } catch (error) {
        logError('PDF search failed', error, {
            userId: req.user?.userId,
            requestId: req.requestId,
            query: req.body?.query
        });
        return errorResponse(res, error);
    }
};