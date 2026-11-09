;;; org_m6b_reference.el --- Synthetic Org reference -*- lexical-binding: t; -*-
(require 'org)
(require 'cl-lib)
(princ (format "Org version: %s\n" (org-version)))
(let ((now (encode-time 0 0 12 10 11 2026)))
  (cl-letf (((symbol-function 'current-time) (lambda () now))
            ((symbol-function 'org-today) (lambda () (time-to-days now)))
            ((symbol-function 'y-or-n-p) (lambda (&rest _) t)))
    (dolist (stamp '("2026-01-31 Sa +1m" "2024-02-29 Do +1y"
                     "2026-01-31 Sa ++1m" "2026-11-09 Mo ++1d"
                     "2026-11-09 Mo 20:00 ++1d" "2026-11-09 Mo .+1w"))
      (with-temp-buffer
        (org-mode)
        (setq-local org-log-repeat nil org-log-done nil org-todo-repeat-to-state nil)
        (insert (format "* TODO Synthetic\nSCHEDULED: <%s>\n" stamp))
        (goto-char (point-min))
        (let ((inhibit-message t)) (org-todo "DONE"))
        (princ (buffer-string))))))
