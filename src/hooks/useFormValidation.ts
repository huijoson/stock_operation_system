'use client'

import { useState, useCallback } from 'react'
import { ValidationResult } from '@/lib/utils/validation'

interface UseFormValidationOptions<T> {
  initialValues: T
  validate: (values: T) => ValidationResult
  onSubmit: (values: T) => void | Promise<void>
}

/**
 * Custom hook for form validation
 */
export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Handle field change
   */
  const handleChange = useCallback(
    (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.type === 'number' 
        ? parseFloat(event.target.value) || 0
        : event.target.value

      setValues((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Clear error when user starts typing
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field as string]
          return newErrors
        })
      }
    },
    [errors]
  )

  /**
   * Handle field blur
   */
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({
        ...prev,
        [field]: true,
      }))

      // Validate single field on blur
      const result = validate(values)
      if (result.errors[field as string]) {
        setErrors((prev) => ({
          ...prev,
          [field as string]: result.errors[field as string],
        }))
      }
    },
    [values, validate]
  )

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  /**
   * Set field error programmatically
   */
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field as string]: error,
    }))
  }, [])

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      )
      setTouched(allTouched)

      // Validate all fields
      const result = validate(values)
      setErrors(result.errors)

      if (!result.isValid) {
        return
      }

      // Submit form
      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, validate, onSubmit]
  )

  /**
   * Get field props for easy binding
   */
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      name: field as string,
      value: values[field] ?? '',
      onChange: handleChange(field),
      onBlur: handleBlur(field),
    }),
    [values, handleChange, handleBlur]
  )

  /**
   * Get field error (only show if touched)
   */
  const getFieldError = useCallback(
    (field: keyof T) => {
      return touched[field as string] ? errors[field as string] : undefined
    },
    [touched, errors]
  )

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    getFieldProps,
    getFieldError,
  }
}
