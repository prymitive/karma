// Code generated by go-swagger; DO NOT EDIT.

package alert

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	"fmt"
	"io"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
)

// PostAlertsReader is a Reader for the PostAlerts structure.
type PostAlertsReader struct {
	formats strfmt.Registry
}

// ReadResponse reads a server response into the received o.
func (o *PostAlertsReader) ReadResponse(response runtime.ClientResponse, consumer runtime.Consumer) (any, error) {
	switch response.Code() {
	case 200:
		result := NewPostAlertsOK()
		if err := result.readResponse(response, consumer, o.formats); err != nil {
			return nil, err
		}
		return result, nil
	case 400:
		result := NewPostAlertsBadRequest()
		if err := result.readResponse(response, consumer, o.formats); err != nil {
			return nil, err
		}
		return nil, result
	case 500:
		result := NewPostAlertsInternalServerError()
		if err := result.readResponse(response, consumer, o.formats); err != nil {
			return nil, err
		}
		return nil, result
	default:
		return nil, runtime.NewAPIError("response status code does not match any response statuses defined for this endpoint in the swagger spec", response, response.Code())
	}
}

// NewPostAlertsOK creates a PostAlertsOK with default headers values
func NewPostAlertsOK() *PostAlertsOK {
	return &PostAlertsOK{}
}

/*
	PostAlertsOK describes a response with status code 200, with default header values.

Create alerts response
*/
type PostAlertsOK struct {
}

func (o *PostAlertsOK) Error() string {
	return fmt.Sprintf("[POST /alerts][%d] postAlertsOK ", 200)
}

func (o *PostAlertsOK) readResponse(response runtime.ClientResponse, consumer runtime.Consumer, formats strfmt.Registry) error {

	return nil
}

// NewPostAlertsBadRequest creates a PostAlertsBadRequest with default headers values
func NewPostAlertsBadRequest() *PostAlertsBadRequest {
	return &PostAlertsBadRequest{}
}

/*
	PostAlertsBadRequest describes a response with status code 400, with default header values.

Bad request
*/
type PostAlertsBadRequest struct {
	Payload string
}

func (o *PostAlertsBadRequest) Error() string {
	return fmt.Sprintf("[POST /alerts][%d] postAlertsBadRequest  %+v", 400, o.Payload)
}
func (o *PostAlertsBadRequest) GetPayload() string {
	return o.Payload
}

func (o *PostAlertsBadRequest) readResponse(response runtime.ClientResponse, consumer runtime.Consumer, formats strfmt.Registry) error {

	// response payload
	if err := consumer.Consume(response.Body(), &o.Payload); err != nil && err != io.EOF {
		return err
	}

	return nil
}

// NewPostAlertsInternalServerError creates a PostAlertsInternalServerError with default headers values
func NewPostAlertsInternalServerError() *PostAlertsInternalServerError {
	return &PostAlertsInternalServerError{}
}

/*
	PostAlertsInternalServerError describes a response with status code 500, with default header values.

Internal server error
*/
type PostAlertsInternalServerError struct {
	Payload string
}

func (o *PostAlertsInternalServerError) Error() string {
	return fmt.Sprintf("[POST /alerts][%d] postAlertsInternalServerError  %+v", 500, o.Payload)
}
func (o *PostAlertsInternalServerError) GetPayload() string {
	return o.Payload
}

func (o *PostAlertsInternalServerError) readResponse(response runtime.ClientResponse, consumer runtime.Consumer, formats strfmt.Registry) error {

	// response payload
	if err := consumer.Consume(response.Body(), &o.Payload); err != nil && err != io.EOF {
		return err
	}

	return nil
}
