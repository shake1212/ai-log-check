# Design Document

## Overview

This design addresses React memory leak warnings in the LoginPage component by implementing proper cleanup patterns for async operations and animations. The solution uses a mounted ref to track component lifecycle and cancels operations when the component unmounts.

## Architecture

The fix follows React best practices for handling async operations and cleanup:

1. **Mounted Ref Pattern**: Use a `useRef` to track whether the component is mounted
2. **Cleanup Functions**: Return cleanup functions from `useEffect` hooks
3. **Conditional State Updates**: Check mounted status before calling state setters

## Components and Interfaces

### LoginPage Component

**Modified State Management:**
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);
```

**Modified Login Handler:**
```typescript
const handleLogin = async (values: LoginForm) => {
  setLoading(true);
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    // Check if still mounted before updating state
    if (!isMountedRef.current) return;

    if (response.ok) {
      const data = await response.json();
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setInitialState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
      });

      message.success('登录成功！');
      history.replace('/dashboard');
    } else {
      // Error handling...
      if (!isMountedRef.current) return;
      message.error(errorMessage);
    }
  } catch (error) {
    if (!isMountedRef.current) return;
    console.error('Login error:', error);
    message.error('网络错误，请稍后重试');
  } finally {
    if (isMountedRef.current) {
      setLoading(false);
    }
  }
};
```

**Modified Animation Effect:**
```typescript
useEffect(() => {
  const canvas = document.getElementById('particles') as HTMLCanvasElement;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{...}> = [];
  
  // Create particles...
  
  let animationFrameId: number;

  function animate() {
    if (!ctx || !canvas || !isMountedRef.current) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Animation logic...
    
    animationFrameId = requestAnimationFrame(animate);
  }

  animate();

  const handleResize = () => {
    if (!isMountedRef.current) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, []);
```

## Data Models

No data model changes required. The fix only modifies component lifecycle management.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No State Updates After Unmount

*For any* async operation in the LoginPage component, if the component unmounts before the operation completes, then no state setter functions should be called.

**Validates: Requirements 1.1, 1.2**

### Property 2: Animation Frame Cleanup

*For any* active animation frame when the component unmounts, the animation frame should be cancelled and no further animation frames should be requested.

**Validates: Requirements 2.1, 2.2**

### Property 3: Mounted Flag Accuracy

*For any* point in the component lifecycle, the isMountedRef.current value should accurately reflect whether the component is currently mounted (true when mounted, false after unmount).

**Validates: Requirements 1.3**

## Error Handling

The existing error handling in the login function remains unchanged. The mounted check is added before displaying error messages to prevent updates on unmounted components.

## Testing Strategy

### Unit Tests

1. **Test mounted ref initialization**: Verify isMountedRef starts as true
2. **Test unmount cleanup**: Verify isMountedRef becomes false after unmount
3. **Test animation frame cancellation**: Verify cancelAnimationFrame is called on unmount

### Property-Based Tests

Property-based testing is not applicable for this fix as it involves React lifecycle behavior that requires integration testing rather than pure function testing.

### Integration Tests

1. **Test login during unmount**: Mount component, trigger login, unmount before response, verify no state updates
2. **Test animation cleanup**: Mount component, verify animation starts, unmount, verify animation stops
3. **Test successful login flow**: Verify existing functionality still works correctly

### Manual Testing

1. Navigate to login page
2. Enter credentials and click login
3. Quickly navigate away (simulate unmount)
4. Verify no console warnings appear
5. Complete normal login flow and verify it works as expected
