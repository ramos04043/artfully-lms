"""
Email templates for automation system
"""
from datetime import date
from typing import List, Dict


def email_wrapper(content: str, title: str = "Artfully Art Studio") -> str:
    """
    HTML email wrapper with Artfully branding
    
    Args:
        content: HTML content to wrap
        title: Email title
        
    Returns:
        Complete HTML email
    """
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #6366f1;
            margin-bottom: 30px;
        }}
        .logo {{
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
        }}
        .content {{
            margin-bottom: 30px;
        }}
        .footer {{
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
        }}
        .class-block {{
            background-color: #f9fafb;
            border-left: 4px solid #6366f1;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }}
        .class-time {{
            font-size: 18px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 5px;
        }}
        .class-details {{
            margin: 10px 0;
        }}
        .student-list {{
            margin: 10px 0 10px 20px;
        }}
        .student-list li {{
            margin: 5px 0;
        }}
        .summary-box {{
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }}
        .highlight {{
            color: #6366f1;
            font-weight: bold;
        }}
        .amount {{
            font-size: 24px;
            color: #10b981;
            font-weight: bold;
        }}
        .info-row {{
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }}
        .info-label {{
            font-weight: 600;
            color: #4b5563;
            display: inline-block;
            width: 140px;
        }}
        .info-value {{
            color: #111827;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎨 Artfully</div>
            <div style="color: #6b7280; font-size: 14px;">Art Studio Management</div>
        </div>
        
        <div class="content">
            {content}
        </div>
        
        <div class="footer">
            <p>This is an automated message from Artfully LMS</p>
            <p style="margin-top: 10px;">
                <strong>Artfully Art Studio</strong><br>
                Your Partner in Creative Learning
            </p>
        </div>
    </div>
</body>
</html>
    """


def daily_class_summary_template(
    summary_date: date,
    classes: List[Dict],
    total_students: int
) -> tuple[str, str]:
    """
    Generate daily class summary email
    
    Args:
        summary_date: Date of the classes
        classes: List of class dictionaries with:
            - time: Class time string
            - programme: Programme name
            - batch: Batch name
            - staff: Staff name
            - students: List of student names
        total_students: Total expected students across all classes
        
    Returns:
        tuple: (subject, html_body)
    """
    date_str = summary_date.strftime("%d %b %Y")
    subject = f"Artfully – Today's Classes | {date_str}"
    
    if not classes:
        content = f"""
            <h2>Daily Class Summary – {date_str}</h2>
            <p>Good morning,</p>
            <p>There are <strong>no classes scheduled</strong> for today.</p>
            <p>Enjoy your day!</p>
        """
    else:
        classes_html = ""
        for cls in classes:
            students_html = "\n".join([f"<li>{student}</li>" for student in cls['students']])
            
            classes_html += f"""
            <div class="class-block">
                <div class="class-time">{cls['time']} – {cls['programme']}</div>
                <div class="class-details">
                    <strong>Batch:</strong> {cls['batch']}<br>
                    <strong>Staff:</strong> {cls['staff']}
                </div>
                <div style="margin-top: 10px;">
                    <strong>Expected Students:</strong>
                    <ul class="student-list">
                        {students_html}
                    </ul>
                </div>
            </div>
            """
        
        content = f"""
            <h2>Daily Class Summary – {date_str}</h2>
            <p>Good morning,</p>
            <p>Here are today's Artfully classes:</p>
            
            {classes_html}
            
            <div class="summary-box">
                <strong>Summary:</strong><br>
                Total Classes: <span class="highlight">{len(classes)}</span><br>
                Total Expected Students: <span class="highlight">{total_students}</span>
            </div>
        """
    
    html_body = email_wrapper(content, subject)
    return subject, html_body


def fee_due_notification_template(
    student_name: str,
    parent_name: str,
    programme_name: str,
    batch_name: str,
    completed_session: str,
    classes_completed: int,
    amount_due: float,
    due_date: date
) -> tuple[str, str]:
    """
    Generate fee due notification email
    
    Args:
        student_name: Student's full name
        parent_name: Parent's name for greeting
        programme_name: Programme name
        batch_name: Batch name
        completed_session: Session name that was completed
        classes_completed: Number of classes completed
        amount_due: Fee amount due
        due_date: Payment due date
        
    Returns:
        tuple: (subject, html_body)
    """
    subject = "Artfully – Session Completed & Fee Due"
    
    due_date_str = due_date.strftime("%d/%m/%Y")
    
    content = f"""
        <h2>Session Completed Successfully!</h2>
        <p>Hello {parent_name},</p>
        
        <p>We're happy to inform you that <strong>{student_name}</strong> has successfully completed a session!</p>
        
        <div class="info-row">
            <span class="info-label">Student:</span>
            <span class="info-value">{student_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Programme:</span>
            <span class="info-value">{programme_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Batch:</span>
            <span class="info-value">{batch_name}</span>
        </div>
        
        <div class="summary-box" style="background-color: #d1fae5; border-color: #6ee7b7; margin: 20px 0;">
            <div style="font-size: 18px; margin-bottom: 10px;">
                <strong>{completed_session}: COMPLETED ✓</strong>
            </div>
            <div>
                Classes Completed: <span class="highlight">{classes_completed} / 8</span>
            </div>
        </div>
        
        <h3 style="color: #6366f1; margin-top: 30px;">Next Session Fee Due</h3>
        
        <p>The next session fee is now due. Please proceed with the payment at your earliest convenience.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Amount Due</div>
            <div class="amount">₹{amount_due:,.2f}</div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                Due Date: <strong>{due_date_str}</strong>
            </div>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #fbbf24; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Payment Instructions:</strong><br>
            Please contact Artfully Art Studio for payment details and methods.
        </div>
        
        <p>Thank you for being a part of the Artfully family!</p>
        
        <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>Artfully Team</strong>
        </p>
    """
    
    html_body = email_wrapper(content, subject)
    return subject, html_body


def session_completion_notification_template(
    student_name: str,
    parent_name: str,
    programme_name: str,
    batch_name: str,
    session_name: str,
    classes_attended: int
) -> tuple[str, str]:
    """
    Generate session completion notification (without fee due)
    
    Args:
        student_name: Student's full name
        parent_name: Parent's name
        programme_name: Programme name
        batch_name: Batch name
        session_name: Completed session name
        classes_attended: Number of classes attended
        
    Returns:
        tuple: (subject, html_body)
    """
    subject = "Artfully – Session Completed!"
    
    content = f"""
        <h2>🎉 Congratulations!</h2>
        <p>Hello {parent_name},</p>
        
        <p>We're delighted to inform you that <strong>{student_name}</strong> has successfully completed a session at Artfully!</p>
        
        <div class="info-row">
            <span class="info-label">Student:</span>
            <span class="info-value">{student_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Programme:</span>
            <span class="info-value">{programme_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Batch:</span>
            <span class="info-value">{batch_name}</span>
        </div>
        
        <div class="summary-box" style="background-color: #d1fae5; border-color: #6ee7b7; margin: 30px 0;">
            <div style="font-size: 20px; text-align: center; margin-bottom: 15px;">
                <strong>{session_name}</strong>
            </div>
            <div style="text-align: center; font-size: 24px; color: #10b981;">
                <strong>✓ COMPLETED</strong>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                Classes Attended: <span class="highlight">{classes_attended} / 8</span>
            </div>
        </div>
        
        <p>We appreciate your continued trust in Artfully Art Studio for {student_name}'s creative journey!</p>
        
        <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Artfully Team</strong>
        </p>
    """
    
    html_body = email_wrapper(content, subject)
    return subject, html_body
