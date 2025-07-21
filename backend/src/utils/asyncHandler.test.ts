import asyncHandler from './asyncHandler';
import { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('should catch errors and pass them to next', async () => {
    const mockRequest = {} as Request;
    const mockResponse = {} as Response;
    const mockNext = jest.fn();

    const errorMessage = 'Test error';
    const asyncFunction = async (req: Request, res: Response, next: NextFunction) => {
      throw new Error(errorMessage);
    };

    const wrappedFunction = asyncHandler(asyncFunction);
    await wrappedFunction(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: errorMessage }));
  });

  it('should execute the function successfully', async () => {
    const mockRequest = {} as Request;
    const mockResponse = {} as Response;
    const mockNext = jest.fn();

    const asyncFunction = async (req: Request, res: Response, next: NextFunction) => {
      return Promise.resolve('Success');
    };

    const wrappedFunction = asyncHandler(asyncFunction);
    await wrappedFunction(mockRequest, mockResponse, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });
});