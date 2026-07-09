/*
 * Copyright (c) 2016-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or
 * without modification, are permitted provided that the following conditions
 * are met:
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * - Neither the name of salesforce.com, inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission of salesforce.com, inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT OWNERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

const fs = require('fs');

// Mock dependencies
jest.mock('../sfdx/shared/jsonChecker', () => ({
    readJsonFile: jest.fn(),
    validateJson: jest.fn()
}));

jest.mock('../sfdx/shared/utils', () => ({
    log: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn()
}));

// Import after mocking
const jsonChecker = require('../sfdx/shared/jsonChecker');
const utils = require('../sfdx/shared/utils');
const createHelper = require('../sfdx/shared/createHelper');

describe('createHelper', () => {
    describe('validateCustomProperties', () => {

        const mockTemplatePath = '/path/to/template.json';

        beforeEach(() => {
            // Reset all mocks before each test
            jest.clearAllMocks();
            
            // Mock console methods to suppress output during tests
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Mock process.exit to prevent test termination
            jest.spyOn(process, 'exit').mockImplementation((code) => {
                throw new Error(`process.exit called with code ${code}`);
            });
        });

        afterEach(() => {
            // Restore all mocks after each test
            jest.restoreAllMocks();
        });

        describe('when template schema file does not exist', () => {
            it('should skip validation and return early', () => {
                jest.spyOn(fs, 'existsSync').mockReturnValue(false);
                
                const customProperties = {
                    developerName: 'bob',
                    organizationId: '550e8400-e29b-41d4-a716-446655440000'
                };

                // Should not throw and should return early
                expect(() => {
                    createHelper.validateCustomProperties(mockTemplatePath, customProperties);
                }).not.toThrow();

                // Verify that readJsonFile was never called
                expect(jsonChecker.readJsonFile).not.toHaveBeenCalled();
            });
        });
        describe('when valid template schema file exists', () => {
            const templateSchema = {
                "title": "Template Prerequisites Schema",
                "description": "Schema for template prerequisites configuration",
                "type": "object",
                "properties": {
                    "templatePrerequisites": {
                        "type": "object",
                        "properties": {
                            "templateProperties": {
                                "type": "object",
                                "properties": {
                                    "organizationId": {
                                        "type": "string",
                                        "format": "uuid",
                                        "description": "Organization identifier in UUID format"
                                    },
                                    "developerName": {
                                        "type": "string",
                                        "description": "Developer name identifier",
                                        "minLength": 1
                                    }
                                },
                                "required": ["organizationId", "developerName"],
                                "additionalProperties": false
                            }
                        },
                        "required": ["templateProperties"],
                        "additionalProperties": false
                    }
                },
                "required": ["templatePrerequisites"],
                "additionalProperties": false
            };
    
            beforeEach(() => {
                jest.spyOn(fs, 'existsSync').mockReturnValue(true);
                jsonChecker.readJsonFile.mockReturnValue(templateSchema);
            });

            it('should validate valid custom properties successfully', () => {
                const customProperties = {
                    developerName: 'bob',
                    organizationId: '550e8400-e29b-41d4-a716-446655440000'
                };

                createHelper.validateCustomProperties(mockTemplatePath, customProperties);
       
                expect(utils.logInfo).toHaveBeenCalledWith(
                    'Custom properties are valid\n',
                    expect.anything()
                );
                expect(utils.logError).not.toHaveBeenCalled();
            });

            it('should fail validation when required fields are missing', () => {
                const customProperties = {
                    developerName: 'bob'
                    // Missing organizationId
                };

                expect(() => {
                    createHelper.validateCustomProperties(mockTemplatePath, customProperties);
                }).toThrow('process.exit called with code 1');

                expect(utils.logError).toHaveBeenCalled();
                expect(utils.logInfo).not.toHaveBeenCalled();
            });

            it('should fail validation when developerName is empty string', () => {
                const customProperties = {
                    developerName: '',
                    organizationId: '550e8400-e29b-41d4-a716-446655440000'
                };

                expect(() => {
                    createHelper.validateCustomProperties(mockTemplatePath, customProperties);
                }).toThrow('process.exit called with code 1');

                expect(utils.logError).toHaveBeenCalled();
                expect(utils.logInfo).not.toHaveBeenCalled();
            });

            it('should fail validation when additional properties are present', () => {
                const customProperties = {
                    developerName: 'bob',
                    organizationId: '550e8400-e29b-41d4-a716-446655440000',
                    extraProperty: 'should not be here'
                };

                expect(() => {
                    createHelper.validateCustomProperties(mockTemplatePath, customProperties);
                }).toThrow('process.exit called with code 1');

                expect(utils.logError).toHaveBeenCalled();
                expect(utils.logInfo).not.toHaveBeenCalled();
            });
        });
    });

    describe('parseCallbackUrl', () => {

        it('should parse a hostless callback URL with an empty host', () => {
            const result = createHelper.parseCallbackUrl('testsfdc:///mobilesdk/detect/oauth/done');

            expect(result).toEqual({
                scheme: 'testsfdc',
                host: '',
                path: '/mobilesdk/detect/oauth/done'
            });
            // Android has no host wildcard - an empty host must never become '*'
            expect(result.host).not.toBe('*');
        });

        it('should parse a callback URL with a real host', () => {
            const result = createHelper.parseCallbackUrl('sfdc://login.salesforce.com/oauth/done');

            expect(result).toEqual({
                scheme: 'sfdc',
                host: 'login.salesforce.com',
                path: '/oauth/done'
            });
            expect(result.host).not.toBe('*');
        });

        it('should treat the authority as the host', () => {
            const result = createHelper.parseCallbackUrl('scheme://success/done');

            expect(result.host).toBe('success');
            expect(result.path).toBe('/done');
            expect(result.host).not.toBe('*');
        });
    });
});
