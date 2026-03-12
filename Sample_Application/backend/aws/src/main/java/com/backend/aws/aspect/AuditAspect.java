package com.backend.aws.aspect;

import com.backend.aws.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @AfterReturning(
        pointcut = "execution(* com.backend.aws.service.*Service.create(..)) || " +
                   "execution(* com.backend.aws.service.*Service.update(..)) || " +
                   "execution(* com.backend.aws.service.*Service.patch(..)) || " +
                   "execution(* com.backend.aws.service.*Service.delete(..))",
        returning = "result"
    )
    public void auditCrudOperation(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String serviceName = joinPoint.getTarget().getClass().getSimpleName();
            String entityType = serviceName.replace("Service", "");

            // Skip audit log's own operations to avoid infinite loop
            if (entityType.equals("Audit")) return;

            String action = switch (methodName) {
                case "create" -> "CREATE";
                case "update" -> "UPDATE";
                case "patch" -> "PATCH";
                case "delete" -> "DELETE";
                default -> methodName.toUpperCase();
            };

            Long entityId = extractId(result, joinPoint);
            String details = String.format("%s.%s() executed", serviceName, methodName);

            auditService.log(entityType, entityId, action, details);
            log.info("AUDIT: {} {} id={}", action, entityType, entityId);
        } catch (Exception e) {
            log.warn("Audit logging failed: {}", e.getMessage());
        }
    }

    private Long extractId(Object result, JoinPoint joinPoint) {
        try {
            if (result != null) {
                var getIdMethod = result.getClass().getMethod("getId");
                Object id = getIdMethod.invoke(result);
                if (id instanceof Long) return (Long) id;
            }
            // For delete, try to get ID from arguments
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof Long) {
                return (Long) args[0];
            }
        } catch (Exception ignored) {}
        return null;
    }
}
